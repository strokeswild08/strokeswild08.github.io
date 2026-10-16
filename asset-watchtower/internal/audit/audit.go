// Package audit inspects asset bytes without modifying source files.
package audit

import (
	"bytes"
	"context"
	"crypto/sha256"
	"encoding/base64"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"image"
	_ "image/gif"
	_ "image/jpeg"
	"image/png"
	"path"
	"regexp"
	"sort"
	"strings"
	"sync"
)

const MaxFile = 12 << 20
const MaxBatch = 64 << 20
const MaxFiles = 1000

type Input struct {
	Path string
	Data []byte
}
type Issue struct {
	Code    string `json:"code"`
	Level   string `json:"level"`
	Message string `json:"message"`
}
type Asset struct {
	Path    string  `json:"path"`
	Bytes   int     `json:"bytes"`
	Hash    string  `json:"hash"`
	Kind    string  `json:"kind"`
	Width   int     `json:"width,omitempty"`
	Height  int     `json:"height,omitempty"`
	Preview string  `json:"preview,omitempty"`
	Issues  []Issue `json:"issues"`
}
type Duplicate struct {
	Hash        string   `json:"hash"`
	Paths       []string `json:"paths"`
	WastedBytes int      `json:"wastedBytes"`
}
type Report struct {
	Version     int         `json:"version"`
	Assets      []Asset     `json:"assets"`
	Duplicates  []Duplicate `json:"duplicates"`
	Missing     []string    `json:"missing"`
	Notes       []string    `json:"notes"`
	TotalBytes  int         `json:"totalBytes"`
	WastedBytes int         `json:"wastedBytes"`
	IssueCount  int         `json:"issueCount"`
}

var namePattern = regexp.MustCompile(`^[a-z0-9][a-z0-9_\-]*$`)

func ValidPath(p string) bool {
	return p != "" && p != "." && len(p) <= 1024 && !strings.ContainsAny(p, "\\\x00\r\n:") && !strings.HasPrefix(p, "/") && path.Clean(p) == p && p != ".." && !strings.HasPrefix(p, "../")
}
func inspect(in Input) Asset {
	sum := sha256.Sum256(in.Data)
	a := Asset{Path: in.Path, Bytes: len(in.Data), Hash: hex.EncodeToString(sum[:]), Kind: strings.TrimPrefix(strings.ToLower(path.Ext(in.Path)), "."), Issues: []Issue{}}
	add := func(c, l, m string) { a.Issues = append(a.Issues, Issue{c, l, m}) }
	stem := strings.TrimSuffix(path.Base(in.Path), path.Ext(in.Path))
	if !namePattern.MatchString(stem) && path.Base(in.Path) != ".watchtower.json" {
		add("naming", "info", "Use lowercase names with underscores or hyphens.")
	}
	if a.Bytes == 0 {
		add("empty", "warning", "File is empty.")
	}
	if a.Bytes > 5<<20 {
		add("large-file", "warning", "File exceeds the 5 MiB review budget.")
	}
	if a.Kind == "png" || a.Kind == "jpg" || a.Kind == "jpeg" || a.Kind == "gif" {
		cfg, _, err := image.DecodeConfig(bytes.NewReader(in.Data))
		if err != nil {
			add("invalid-image", "warning", "Image header could not be decoded.")
			return a
		}
		a.Width = cfg.Width
		a.Height = cfg.Height
		if cfg.Width > 2048 || cfg.Height > 2048 {
			add("large-texture", "warning", "Texture exceeds 2048 px on at least one side.")
		}
		if cfg.Width&(cfg.Width-1) != 0 || cfg.Height&(cfg.Height-1) != 0 {
			add("non-power-of-two", "info", "Dimensions are not powers of two; review for your target engine.")
		}
		if cfg.Width <= 0 || cfg.Height <= 0 || int64(cfg.Width)*int64(cfg.Height) > 16_000_000 {
			add("preview-limit", "info", "Preview skipped: image exceeds the 16 megapixel decode budget.")
			return a
		}
		img, _, err := image.Decode(bytes.NewReader(in.Data))
		if err != nil {
			add("invalid-image", "warning", "Image pixels could not be decoded.")
			return a
		}
		w, h := cfg.Width, cfg.Height
		if w > 192 || h > 192 {
			if w >= h {
				h = max(1, h*192/w)
				w = 192
			} else {
				w = max(1, w*192/h)
				h = 192
			}
		}
		thumb := image.NewNRGBA(image.Rect(0, 0, w, h))
		b := img.Bounds()
		for y := 0; y < h; y++ {
			for x := 0; x < w; x++ {
				thumb.Set(x, y, img.At(b.Min.X+x*cfg.Width/w, b.Min.Y+y*cfg.Height/h))
			}
		}
		var buf bytes.Buffer
		if png.Encode(&buf, thumb) == nil {
			a.Preview = "data:image/png;base64," + base64.StdEncoding.EncodeToString(buf.Bytes())
		}
	}
	return a
}

// Analyze uses four bounded workers. Results are sorted for reproducible reports.
func Analyze(ctx context.Context, inputs []Input) (Report, error) {
	r := Report{Version: 1, Assets: []Asset{}, Duplicates: []Duplicate{}, Missing: []string{}, Notes: []string{}}
	if len(inputs) > MaxFiles {
		return r, fmt.Errorf("maximum %d files per scan", MaxFiles)
	}
	seen := map[string]bool{}
	total := 0
	for _, in := range inputs {
		if !ValidPath(in.Path) || seen[in.Path] {
			return r, fmt.Errorf("invalid or repeated path: %q", in.Path)
		}
		seen[in.Path] = true
		total += len(in.Data)
		if len(in.Data) > MaxFile || total > MaxBatch {
			return r, fmt.Errorf("scan exceeds 12 MiB per file or 64 MiB total")
		}
	}
	jobs := make(chan Input)
	results := make(chan Asset, 4)
	var wg sync.WaitGroup
	for i := 0; i < 4; i++ {
		wg.Add(1)
		go func() {
			defer wg.Done()
			for in := range jobs {
				select {
				case <-ctx.Done():
					return
				default:
				}
				a := inspect(in)
				select {
				case results <- a:
				case <-ctx.Done():
					return
				}
			}
		}()
	}
	go func() {
		defer close(jobs)
		for _, in := range inputs {
			select {
			case jobs <- in:
			case <-ctx.Done():
				return
			}
		}
	}()
	go func() { wg.Wait(); close(results) }()
	for a := range results {
		r.Assets = append(r.Assets, a)
		r.TotalBytes += a.Bytes
	}
	if err := ctx.Err(); err != nil {
		return r, err
	}
	sort.Slice(r.Assets, func(i, j int) bool { return r.Assets[i].Path < r.Assets[j].Path })
	groups := map[string][]int{}
	for i, a := range r.Assets {
		groups[a.Hash] = append(groups[a.Hash], i)
	}
	for hash, ids := range groups {
		if len(ids) < 2 {
			continue
		}
		d := Duplicate{Hash: hash, Paths: []string{}, WastedBytes: (len(ids) - 1) * r.Assets[ids[0]].Bytes}
		for _, i := range ids {
			d.Paths = append(d.Paths, r.Assets[i].Path)
			r.Assets[i].Issues = append(r.Assets[i].Issues, Issue{"duplicate", "warning", "Identical bytes found in another file."})
		}
		r.Duplicates = append(r.Duplicates, d)
		r.WastedBytes += d.WastedBytes
	}
	sort.Slice(r.Duplicates, func(i, j int) bool { return r.Duplicates[i].Paths[0] < r.Duplicates[j].Paths[0] })
	// The optional root manifest lists required paths; this is explicit, engine-neutral validation.
	for _, in := range inputs {
		if in.Path != ".watchtower.json" {
			continue
		}
		var m struct {
			Required []string `json:"required"`
		}
		if json.Unmarshal(in.Data, &m) != nil {
			r.Notes = append(r.Notes, "Could not parse .watchtower.json.")
			continue
		}
		missing := map[string]bool{}
		for _, p := range m.Required {
			if !ValidPath(p) {
				r.Notes = append(r.Notes, "Manifest contains an invalid required path.")
				continue
			}
			if !seen[p] {
				missing[p] = true
			}
		}
		for p := range missing {
			r.Missing = append(r.Missing, p)
		}
	}
	sort.Strings(r.Missing)
	for _, a := range r.Assets {
		r.IssueCount += len(a.Issues)
	}
	r.IssueCount += len(r.Missing) + len(r.Notes)
	return r, nil
}
