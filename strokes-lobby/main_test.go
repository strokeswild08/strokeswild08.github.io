package main

import (
	"bufio"
	"bytes"
	"context"
	"encoding/json"
	"io"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"
	"wildstrokes/strokes-lobby/internal/lobby"
)

func request(h http.Handler, method, path, body, token, origin string) *httptest.ResponseRecorder {
	r := httptest.NewRequest(method, "http://127.0.0.1:8989"+path, strings.NewReader(body))
	r.Header.Set("Content-Type", "application/json")
	if token != "" {
		r.Header.Set("Authorization", "Bearer "+token)
	}
	if origin != "" {
		r.Header.Set("Origin", origin)
	}
	w := httptest.NewRecorder()
	h.ServeHTTP(w, r)
	return w
}
func TestAPIFlow(t *testing.T) {
	h := lobby.New()
	srv := handler(h)
	w := request(srv, "POST", "/api/create", `{"name":"Owais","title":"Night crew"}`, "", "")
	if w.Code != 201 {
		t.Fatal(w.Code, w.Body.String())
	}
	var a lobby.Session
	json.Unmarshal(w.Body.Bytes(), &a)
	w = request(srv, "POST", "/api/join", `{"name":"Mina","code":"`+a.Code+`"}`, "", "")
	if w.Code != 200 {
		t.Fatal(w.Code, w.Body.String())
	}
	var b lobby.Session
	json.Unmarshal(w.Body.Bytes(), &b)
	h.Subscribe(a.Token)
	h.Subscribe(b.Token)
	w = request(srv, "POST", "/api/action", `{"type":"start"}`, a.Token, "")
	if w.Code != 400 {
		t.Fatal("unready start allowed")
	}
	w = request(srv, "POST", "/api/action", `{"type":"ready"}`, b.Token, "")
	if w.Code != 200 {
		t.Fatal(w.Body.String())
	}
	w = request(srv, "POST", "/api/action", `{"type":"start"}`, a.Token, "")
	if w.Code != 200 {
		t.Fatal(w.Body.String())
	}
	w = request(srv, "POST", "/api/action", `{"type":"move","x":999,"y":0}`, b.Token, "")
	if w.Code != 200 {
		t.Fatal(w.Body.String())
	}
	h.Tick(50 * time.Millisecond)
	s, _ := h.State(b.Token)
	if s.Players[1].X != 219 {
		t.Fatal("authoritative step wrong")
	}
}
func TestHTTPGuards(t *testing.T) {
	srv := handler(lobby.New())
	for _, tc := range []struct {
		method, path, body, token, origin string
		code                              int
	}{{"POST", "/api/create", `{}`, "", "https://other.example", 403}, {"POST", "/api/create", `{"name":"N","title":"T","unexpected":1}`, "", "", 400}, {"POST", "/api/create", `{"name":"N","title":"T"} {}`, "", "", 400}, {"POST", "/api/create", strings.Repeat("x", 3000), "", "", 400}, {"POST", "/api/action", `{"type":"start"}`, "bad", "", 401}, {"GET", "/api/events", "", "bad", "", 401}, {"GET", "/", "", "", "", 200}, {"GET", "/app.js", "", "", "", 200}, {"GET", "/style.css", "", "", "", 200}, {"GET", "/missing", "", "", "", 404}, {"GET", "/api/create", "", "", "", 405}} {
		w := request(srv, tc.method, tc.path, tc.body, tc.token, tc.origin)
		if w.Code != tc.code {
			t.Errorf("%s %s: %d want %d", tc.method, tc.path, w.Code, tc.code)
		}
		if w.Header().Get("Content-Security-Policy") == "" {
			t.Fatal("no CSP")
		}
	}
	w := httptest.NewRecorder()
	srv.ServeHTTP(w, httptest.NewRequest("GET", "http://evil.example/", nil))
	if w.Code != 403 {
		t.Fatal("host not guarded")
	}
}
func TestActualSSEAndDisconnect(t *testing.T) {
	h := lobby.New()
	a, _ := h.Create("Host", "Live test")
	s := httptest.NewServer(handler(h))
	defer s.Close()
	ctx, cancel := context.WithTimeout(context.Background(), 3*time.Second)
	defer cancel()
	req, _ := http.NewRequestWithContext(ctx, "GET", s.URL+"/api/events", nil)
	req.Header.Set("Authorization", "Bearer "+a.Token)
	resp, e := http.DefaultClient.Do(req)
	if e != nil {
		t.Fatal(e)
	}
	if resp.StatusCode != 200 || resp.Header.Get("Content-Type") != "text/event-stream" {
		t.Fatal("not SSE")
	}
	reader := bufio.NewReader(resp.Body)
	line, e := reader.ReadString('\n')
	if e != nil || !strings.HasPrefix(line, "data: ") {
		t.Fatal("no event", e)
	}
	var snap lobby.Snapshot
	if e = json.Unmarshal([]byte(strings.TrimPrefix(line, "data: ")), &snap); e != nil || !snap.Players[0].Connected {
		t.Fatal("bad snapshot", e)
	}
	reader.ReadString('\n')
	h.Act(a.Token, lobby.Action{Type: "chat", Text: "Live event"})
	line, e = reader.ReadString('\n')
	if e != nil || !bytes.Contains([]byte(line), []byte("Live event")) {
		t.Fatal("no live update", e)
	}
	resp.Body.Close()
	cancel()
	deadline := time.Now().Add(time.Second)
	for time.Now().Before(deadline) {
		state, _ := h.State(a.Token)
		if !state.Players[0].Connected {
			return
		}
		time.Sleep(time.Millisecond)
	}
	t.Fatal("disconnect not observed")
}
func TestAdmissionLimit(t *testing.T) {
	srv := handler(lobby.New())
	last := 0
	for i := 0; i < 13; i++ {
		w := request(srv, "POST", "/api/join", `{"name":"Guest","code":"000000"}`, "", "")
		last = w.Code
		io.Copy(io.Discard, w.Result().Body)
	}
	if last != 429 {
		t.Fatal("admission limit", last)
	}
}
