package audit

import (
	"bytes"
	"context"
	"encoding/base64"
	"encoding/json"
	"image"
	"image/color"
	"image/png"
	"reflect"
	"strings"
	"testing"
)

func picture(w, h int) []byte {
	img := image.NewNRGBA(image.Rect(0, 0, w, h))
	img.Set(0, 0, color.NRGBA{255, 125, 20, 255})
	var b bytes.Buffer
	png.Encode(&b, img)
	return b.Bytes()
}
func has(a Asset, code string) bool {
	for _, i := range a.Issues {
		if i.Code == code {
			return true
		}
	}
	return false
}
func TestInventory(t *testing.T) {
	img := picture(64, 64)
	inputs := []Input{{"textures/tile.png", img}, {"copy/tile.png", img}, {"Bad Name.txt", []byte("hello")}, {"empty.wav", nil}, {"hero.png", picture(30, 64)}, {"broken.png", []byte("not a png")}, {".watchtower.json", []byte(`{"required":["textures/tile.png","missing.png","missing.png","../outside"]}`)}}
	r, e := Analyze(context.Background(), inputs)
	if e != nil {
		t.Fatal(e)
	}
	if len(r.Assets) != 7 || len(r.Duplicates) != 1 || r.WastedBytes != len(img) || !reflect.DeepEqual(r.Missing, []string{"missing.png"}) || len(r.Notes) != 1 {
		t.Fatalf("bad summary: %+v", r)
	}
	indexed := map[string]Asset{}
	for _, a := range r.Assets {
		indexed[a.Path] = a
	}
	for p, c := range map[string]string{"Bad Name.txt": "naming", "empty.wav": "empty", "hero.png": "non-power-of-two", "broken.png": "invalid-image", "textures/tile.png": "duplicate"} {
		if !has(indexed[p], c) {
			t.Errorf("%s missing %s", p, c)
		}
	}
	a := indexed["textures/tile.png"]
	if a.Width != 64 || a.Height != 64 {
		t.Fatal("dimensions")
	}
	data, e := base64.StdEncoding.DecodeString(strings.TrimPrefix(a.Preview, "data:image/png;base64,"))
	if e != nil {
		t.Fatal(e)
	}
	cfg, e := png.DecodeConfig(bytes.NewReader(data))
	if e != nil || cfg.Width != 64 {
		t.Fatal("invalid actual PNG preview")
	}
	again, _ := Analyze(context.Background(), inputs)
	x, _ := json.Marshal(r)
	y, _ := json.Marshal(again)
	if !bytes.Equal(x, y) {
		t.Fatal("nondeterministic output")
	}
}
func TestImageBudgets(t *testing.T) {
	r, e := Analyze(context.Background(), []Input{{"wide.png", picture(2050, 8)}})
	if e != nil {
		t.Fatal(e)
	}
	a := r.Assets[0]
	if !has(a, "large-texture") {
		t.Fatal("texture budget missed")
	}
	p, _ := base64.StdEncoding.DecodeString(strings.TrimPrefix(a.Preview, "data:image/png;base64,"))
	c, e := png.DecodeConfig(bytes.NewReader(p))
	if e != nil || c.Width > 192 || c.Height > 192 {
		t.Fatal("preview not bounded")
	}
}
func TestValidationAndCancellation(t *testing.T) {
	for _, p := range []string{"../secret", "/absolute", "a/../b", "C:/file", "x\\file", "a\x00b", "a//b", ""} {
		if ValidPath(p) {
			t.Errorf("accepted %q", p)
		}
	}
	if !ValidPath("textures/tile.png") {
		t.Fatal("valid path rejected")
	}
	for _, inputs := range [][]Input{{{"a", nil}, {"a", nil}}, {{"../a", nil}}, {{"large", make([]byte, MaxFile+1)}}, make([]Input, MaxFiles+1)} {
		if _, e := Analyze(context.Background(), inputs); e == nil {
			t.Fatal("invalid input accepted")
		}
	}
	ctx, cancel := context.WithCancel(context.Background())
	cancel()
	if _, e := Analyze(ctx, []Input{{"a", []byte("a")}}); e != context.Canceled {
		t.Fatalf("cancellation: %v", e)
	}
}
func TestEmptyAndMalformedManifest(t *testing.T) {
	r, e := Analyze(context.Background(), nil)
	if e != nil || len(r.Assets) != 0 {
		t.Fatal(e)
	}
	r, e = Analyze(context.Background(), []Input{{".watchtower.json", []byte("{")}})
	if e != nil || len(r.Notes) != 1 {
		t.Fatal("malformed manifest not reported")
	}
}
