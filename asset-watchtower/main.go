// Asset Watchtower is a local asset auditor with a browser dashboard and CLI.
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
	"path/filepath"
	"strings"
	"sync"
	"time"
	"wildstrokes/asset-watchtower/internal/audit"
)

//go:embed web/*
var web embed.FS

func handler() http.Handler {
	mux := http.NewServeMux()
	sub, _ := fs.Sub(web, "web")
	static := http.FileServer(http.FS(sub))
	gate := make(chan struct{}, 1)
	mux.HandleFunc("/api/scan", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Cache-Control", "no-store")
		if r.Method != "POST" {
			http.Error(w, "POST required", 405)
			return
		}
		// Browser requests must originate on this local dashboard. No cross-origin uploads.
		if origin := r.Header.Get("Origin"); origin != "" && origin != "http://"+r.Host {
			http.Error(w, "origin rejected", 403)
			return
		}
		select {
		case gate <- struct{}{}:
			defer func() { <-gate }()
		default:
			http.Error(w, "A scan is already running", 429)
			return
		}
		r.Body = http.MaxBytesReader(w, r.Body, audit.MaxBatch+(2<<20))
		defer r.Body.Close()
		reader, err := r.MultipartReader()
		if err != nil {
			http.Error(w, "Expected a multipart folder upload", 400)
			return
		}
		inputs := []audit.Input{}
		total := 0
		for {
			p, e := reader.NextPart()
			if e == io.EOF {
				break
			}
			if e != nil {
				http.Error(w, "Upload exceeds the limit or is incomplete", 400)
				return
			}
			name := strings.TrimPrefix(p.FormName(), "asset:")
			if !strings.HasPrefix(p.FormName(), "asset:") || !audit.ValidPath(name) {
				http.Error(w, "Invalid asset path", 400)
				return
			}
			data, e := io.ReadAll(io.LimitReader(p, audit.MaxFile+1))
			p.Close()
			total += len(data)
			if e != nil || len(data) > audit.MaxFile || total > audit.MaxBatch || len(inputs) >= audit.MaxFiles {
				http.Error(w, "Limit: 1000 files, 12 MiB/file, 64 MiB total", 413)
				return
			}
			inputs = append(inputs, audit.Input{Path: name, Data: data})
		}
		report, e := audit.Analyze(r.Context(), inputs)
		if e != nil {
			http.Error(w, e.Error(), 400)
			return
		}
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(report)
	})
	mux.Handle("/", static)
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("X-Content-Type-Options", "nosniff")
		w.Header().Set("Referrer-Policy", "no-referrer")
		w.Header().Set("Content-Security-Policy", "default-src 'self'; img-src 'self' data:; style-src 'self'; script-src 'self'; connect-src 'self'; frame-ancestors 'none'; base-uri 'none'; form-action 'self'")
		// Host allowlist also blocks DNS rebinding to the loopback service.
		host, _, e := net.SplitHostPort(r.Host)
		if e != nil {
			host = r.Host
		}
		if host != "127.0.0.1" && host != "localhost" && host != "[::1]" && host != "::1" {
			http.Error(w, "Loopback host required", 403)
			return
		}
		mux.ServeHTTP(w, r)
	})
}
func readFolder(root string) ([]audit.Input, error) {
	root, err := filepath.Abs(root)
	if err != nil {
		return nil, err
	}
	info, err := os.Lstat(root)
	if err != nil {
		return nil, err
	}
	if !info.IsDir() {
		return nil, errors.New("scan root must be a real directory")
	}
	handle, err := os.OpenRoot(root)
	if err != nil {
		return nil, err
	}
	defer handle.Close()
	inputs := []audit.Input{}
	total := 0
	err = filepath.WalkDir(root, func(p string, d fs.DirEntry, e error) error {
		if e != nil {
			return e
		}
		if d.IsDir() {
			if p != root && (d.Name() == ".git" || d.Name() == "node_modules" || d.Name() == ".godot") {
				return filepath.SkipDir
			}
			return nil
		}
		if d.Type()&os.ModeSymlink != 0 {
			return nil
		}
		info, e := d.Info()
		if e != nil {
			return e
		}
		if !info.Mode().IsRegular() {
			return nil
		}
		if info.Size() > audit.MaxFile || len(inputs) >= audit.MaxFiles || int64(total)+info.Size() > audit.MaxBatch {
			return errors.New("folder exceeds scan limits; select a smaller asset folder")
		}
		relative, e := filepath.Rel(root, p)
		if e != nil {
			return e
		}
		f, e := handle.Open(relative)
		if e != nil {
			return e
		}
		data, e := io.ReadAll(io.LimitReader(f, audit.MaxFile+1))
		f.Close()
		if e != nil {
			return e
		}
		total += len(data)
		rel, e := filepath.Rel(root, p)
		if e != nil {
			return e
		}
		inputs = append(inputs, audit.Input{Path: filepath.ToSlash(rel), Data: data})
		return nil
	})
	return inputs, err
}
func main() {
	scan := flag.String("scan", "", "Scan a folder and write JSON to stdout instead of serving")
	port := flag.Int("port", 8787, "Local dashboard port")
	flag.Parse()
	if *scan != "" {
		inputs, e := readFolder(*scan)
		if e != nil {
			log.Fatal(e)
		}
		r, e := audit.Analyze(context.Background(), inputs)
		if e != nil {
			log.Fatal(e)
		}
		enc := json.NewEncoder(os.Stdout)
		enc.SetIndent("", "  ")
		if e = enc.Encode(r); e != nil {
			log.Fatal(e)
		}
		return
	}
	listener, e := net.Listen("tcp", fmt.Sprintf("127.0.0.1:%d", *port))
	if e != nil {
		log.Fatal(e)
	}
	server := &http.Server{Handler: handler(), ReadHeaderTimeout: 5 * time.Second, ReadTimeout: 2 * time.Minute, WriteTimeout: 2 * time.Minute, IdleTimeout: 30 * time.Second, MaxHeaderBytes: 32 << 10}
	ctx, stop := signal.NotifyContext(context.Background(), os.Interrupt)
	defer stop()
	var once sync.Once
	go func() {
		<-ctx.Done()
		once.Do(func() {
			c, cancel := context.WithTimeout(context.Background(), 5*time.Second)
			defer cancel()
			server.Shutdown(c)
		})
	}()
	fmt.Printf("Asset Watchtower → http://%s\nPress Ctrl+C to stop. Files are processed in memory.\n", listener.Addr())
	if e = server.Serve(listener); e != nil && !errors.Is(e, http.ErrServerClosed) {
		log.Fatal(e)
	}
}
