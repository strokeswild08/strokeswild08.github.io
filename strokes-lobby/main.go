package main

import (
	"context"
	"embed"
	"encoding/json"
	"errors"
	"flag"
	"fmt"
	"io"
	"io/fs"
	"log"
	"net"
	"net/http"
	"os"
	"os/signal"
	"strings"
	"sync"
	"time"
	"wildstrokes/strokes-lobby/internal/lobby"
)

//go:embed web/*
var web embed.FS

func reply(w http.ResponseWriter, code int, data any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(code)
	json.NewEncoder(w).Encode(data)
}
func fail(w http.ResponseWriter, code int, e error) {
	reply(w, code, map[string]string{"error": e.Error()})
}
func decode(w http.ResponseWriter, r *http.Request, v any) error {
	r.Body = http.MaxBytesReader(w, r.Body, 2048)
	defer r.Body.Close()
	d := json.NewDecoder(r.Body)
	d.DisallowUnknownFields()
	if e := d.Decode(v); e != nil {
		return errors.New("invalid JSON or request exceeds 2 KiB")
	}
	var extra any
	if d.Decode(&extra) != io.EOF {
		return errors.New("expected one JSON object")
	}
	return nil
}
func bearer(r *http.Request) string {
	s := r.Header.Get("Authorization")
	if !strings.HasPrefix(s, "Bearer ") {
		return ""
	}
	return strings.TrimPrefix(s, "Bearer ")
}
func handler(h *lobby.Hub) http.Handler {
	mux := http.NewServeMux()
	var mu sync.Mutex
	var start = time.Now()
	attempts := 0
	admission := func() bool {
		mu.Lock()
		defer mu.Unlock()
		if time.Since(start) > time.Second {
			start = time.Now()
			attempts = 0
		}
		attempts++
		return attempts <= 12
	}
	mux.HandleFunc("POST /api/create", func(w http.ResponseWriter, r *http.Request) {
		if !admission() {
			fail(w, 429, errors.New("try again in a second"))
			return
		}
		var in struct {
			Name  string `json:"name"`
			Title string `json:"title"`
		}
		if e := decode(w, r, &in); e != nil {
			fail(w, 400, e)
			return
		}
		s, e := h.Create(in.Name, in.Title)
		if e != nil {
			fail(w, 400, e)
			return
		}
		reply(w, 201, s)
	})
	mux.HandleFunc("POST /api/join", func(w http.ResponseWriter, r *http.Request) {
		if !admission() {
			fail(w, 429, errors.New("try again in a second"))
			return
		}
		var in struct {
			Name string `json:"name"`
			Code string `json:"code"`
		}
		if e := decode(w, r, &in); e != nil {
			fail(w, 400, e)
			return
		}
		s, e := h.Join(in.Code, in.Name)
		if e != nil {
			fail(w, 400, e)
			return
		}
		reply(w, 200, s)
	})
	mux.HandleFunc("POST /api/action", func(w http.ResponseWriter, r *http.Request) {
		token := bearer(r)
		if !h.Valid(token) {
			fail(w, 401, errors.New("session expired"))
			return
		}
		var a lobby.Action
		if e := decode(w, r, &a); e != nil {
			fail(w, 400, e)
			return
		}
		if e := h.Act(token, a); e != nil {
			fail(w, 400, e)
			return
		}
		reply(w, 200, map[string]bool{"ok": true})
	})
	mux.HandleFunc("GET /api/events", func(w http.ResponseWriter, r *http.Request) {
		token := bearer(r)
		stream, epoch, e := h.Subscribe(token)
		if e != nil {
			fail(w, 401, e)
			return
		}
		defer h.Detach(token, epoch)
		w.Header().Set("Content-Type", "text/event-stream")
		w.Header().Set("X-Accel-Buffering", "no")
		w.Header().Set("Cache-Control", "no-store")
		rc := http.NewResponseController(w)
		heartbeat := time.NewTicker(8 * time.Second)
		defer heartbeat.Stop()
		for {
			select {
			case <-r.Context().Done():
				return
			case data, ok := <-stream:
				if !ok {
					return
				}
				rc.SetWriteDeadline(time.Now().Add(5 * time.Second))
				if _, e := fmt.Fprintf(w, "data: %s\n\n", data); e != nil {
					return
				}
				if e := rc.Flush(); e != nil {
					return
				}
			case <-heartbeat.C:
				rc.SetWriteDeadline(time.Now().Add(5 * time.Second))
				if _, e := io.WriteString(w, ": ping\n\n"); e != nil {
					return
				}
				if e := rc.Flush(); e != nil {
					return
				}
			}
		}
	})
	mux.HandleFunc("/api/", func(w http.ResponseWriter, r *http.Request) {
		switch r.URL.Path {
		case "/api/create", "/api/join", "/api/action":
			w.Header().Set("Allow", "POST")
			fail(w, 405, errors.New("POST required"))
		case "/api/events":
			w.Header().Set("Allow", "GET")
			fail(w, 405, errors.New("GET required"))
		default:
			fail(w, 404, errors.New("API route not found"))
		}
	})
	sub, _ := fs.Sub(web, "web")
	mux.Handle("/", http.FileServer(http.FS(sub)))
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("X-Content-Type-Options", "nosniff")
		w.Header().Set("Referrer-Policy", "no-referrer")
		w.Header().Set("Cache-Control", "no-store")
		w.Header().Set("Content-Security-Policy", "default-src 'self'; script-src 'self'; style-src 'self'; connect-src 'self'; img-src 'self' data:; frame-ancestors 'none'; base-uri 'none'; form-action 'self'")
		host, _, e := net.SplitHostPort(r.Host)
		if e != nil {
			host = r.Host
		}
		if host != "127.0.0.1" && host != "localhost" && host != "::1" {
			fail(w, 403, errors.New("loopback host required"))
			return
		}
		if origin := r.Header.Get("Origin"); origin != "" && origin != "http://"+r.Host {
			fail(w, 403, errors.New("origin rejected"))
			return
		}
		mux.ServeHTTP(w, r)
	})
}
func main() {
	port := flag.Int("port", 8989, "Local server port")
	flag.Parse()
	h := lobby.New()
	listener, e := net.Listen("tcp", fmt.Sprintf("127.0.0.1:%d", *port))
	if e != nil {
		log.Fatal(e)
	}
	server := &http.Server{Handler: handler(h), ReadHeaderTimeout: 5 * time.Second, ReadTimeout: 10 * time.Second, IdleTimeout: 30 * time.Second, MaxHeaderBytes: 16 << 10}
	ctx, stop := signal.NotifyContext(context.Background(), os.Interrupt)
	defer stop()
	go func() {
		ticker := time.NewTicker(50 * time.Millisecond)
		defer ticker.Stop()
		for {
			select {
			case <-ctx.Done():
				c, cancel := context.WithTimeout(context.Background(), 3*time.Second)
				server.Shutdown(c)
				cancel()
				return
			case <-ticker.C:
				h.Tick(50 * time.Millisecond)
			}
		}
	}()
	fmt.Printf("Strokes Lobby → http://%s\nOpen two independent tabs. Ctrl+C stops the server.\n", listener.Addr())
	if e = server.Serve(listener); e != nil && !errors.Is(e, http.ErrServerClosed) {
		log.Fatal(e)
	}
}
