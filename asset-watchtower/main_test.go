package main

import (
	"bytes"
	"encoding/json"
	"io"
	"mime/multipart"
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
	"strings"
	"testing"
	"wildstrokes/asset-watchtower/internal/audit"
)

func upload(t *testing.T, h http.Handler, paths map[string][]byte, origin string) *httptest.ResponseRecorder {
	t.Helper()
	var b bytes.Buffer
	mw := multipart.NewWriter(&b)
	for p, data := range paths {
		part, e := mw.CreateFormFile("asset:"+p, "file.bin")
		if e != nil {
			t.Fatal(e)
		}
		part.Write(data)
	}
	mw.Close()
	req := httptest.NewRequest("POST", "http://127.0.0.1:8787/api/scan", &b)
	req.Header.Set("Content-Type", mw.FormDataContentType())
	if origin != "" {
		req.Header.Set("Origin", origin)
	}
	rec := httptest.NewRecorder()
	h.ServeHTTP(rec, req)
	return rec
}
func TestHTTPScan(t *testing.T) {
	h := handler()
	rec := upload(t, h, map[string][]byte{"nested/a.txt": []byte("same"), "b.txt": []byte("same"), ".watchtower.json": []byte(`{"required":["lost.png"]}`)}, "http://127.0.0.1:8787")
	if rec.Code != 200 {
		t.Fatal(rec.Code, rec.Body.String())
	}
	var r audit.Report
	if e := json.Unmarshal(rec.Body.Bytes(), &r); e != nil {
		t.Fatal(e)
	}
	if len(r.Assets) != 3 || len(r.Duplicates) != 1 || len(r.Missing) != 1 {
		t.Fatal("report mismatch")
	}
	if r.Assets[2].Path != "nested/a.txt" {
		t.Fatal("nested path lost")
	}
}
func TestHTTPGuards(t *testing.T) {
	h := handler()
	for _, tc := range []struct {
		paths  map[string][]byte
		origin string
		code   int
	}{{map[string][]byte{"a": nil}, "https://evil.example", 403}, {map[string][]byte{"../outside": nil}, "", 400}, {map[string][]byte{"large": make([]byte, audit.MaxFile+1)}, "", 413}} {
		r := upload(t, h, tc.paths, tc.origin)
		if r.Code != tc.code {
			t.Fatalf("got %d want %d", r.Code, tc.code)
		}
	}
	for _, tc := range []struct {
		method, url string
		code        int
	}{{"GET", "http://127.0.0.1:8787/api/scan", 405}, {"GET", "http://evil.example/", 403}, {"GET", "http://127.0.0.1:8787/", 200}, {"GET", "http://127.0.0.1:8787/app.js", 200}, {"GET", "http://127.0.0.1:8787/style.css", 200}, {"GET", "http://127.0.0.1:8787/not-found", 404}, {"POST", "http://127.0.0.1:8787/api/scan", 400}} {
		rec := httptest.NewRecorder()
		h.ServeHTTP(rec, httptest.NewRequest(tc.method, tc.url, nil))
		if rec.Code != tc.code {
			t.Errorf("%s: %d", tc.url, rec.Code)
		}
		if rec.Header().Get("Content-Security-Policy") == "" {
			t.Error("missing CSP")
		}
	}
}
func TestCLIReadFolder(t *testing.T) {
	root := t.TempDir()
	os.MkdirAll(filepath.Join(root, "nested"), 0700)
	os.MkdirAll(filepath.Join(root, ".git"), 0700)
	os.WriteFile(filepath.Join(root, "nested", "tile.txt"), []byte("hello"), 0600)
	os.WriteFile(filepath.Join(root, ".git", "config"), []byte("ignored"), 0600)
	outside := filepath.Join(t.TempDir(), "secret")
	os.WriteFile(outside, []byte("secret"), 0600)
	os.Symlink(outside, filepath.Join(root, "link"))
	inputs, e := readFolder(root)
	if e != nil || len(inputs) != 1 || inputs[0].Path != "nested/tile.txt" {
		t.Fatalf("%+v %v", inputs, e)
	}
	if _, e = readFolder(outside); e == nil {
		t.Fatal("file root accepted")
	}
}
func TestIncompleteUpload(t *testing.T) {
	req := httptest.NewRequest("POST", "http://localhost:8787/api/scan", strings.NewReader("--abc\r\nContent-Disposition: form-data; name=\"asset:a\"; filename=\"a\"\r\n\r\ntruncated"))
	req.Header.Set("Content-Type", "multipart/form-data; boundary=abc")
	rec := httptest.NewRecorder()
	handler().ServeHTTP(rec, req)
	if rec.Code == 200 {
		t.Fatal("truncated upload accepted")
	}
}
func TestActualListener(t *testing.T) {
	s := httptest.NewServer(handler())
	defer s.Close()
	resp, e := http.Get(s.URL + "/")
	if e != nil {
		t.Fatal(e)
	}
	defer resp.Body.Close()
	b, _ := io.ReadAll(resp.Body)
	if resp.StatusCode != 200 || !bytes.Contains(b, []byte("Asset Watchtower")) {
		t.Fatal("actual server page failed")
	}
}
