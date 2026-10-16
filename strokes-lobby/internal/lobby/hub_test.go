package lobby

import (
	"encoding/json"
	"math"
	"strings"
	"sync"
	"testing"
	"time"
)

func pair(t *testing.T) (*Hub, Session, Session) {
	t.Helper()
	h := New()
	a, e := h.Create("Owais", "Night crew")
	if e != nil {
		t.Fatal(e)
	}
	b, e := h.Join(a.Code, "Mina")
	if e != nil {
		t.Fatal(e)
	}
	h.Subscribe(a.Token)
	h.Subscribe(b.Token)
	return h, a, b
}
func must(t *testing.T, h *Hub, s Session, a Action) {
	t.Helper()
	if e := h.Act(s.Token, a); e != nil {
		t.Fatal(e)
	}
}
func TestRoomLifecycleAndPermissions(t *testing.T) {
	h, a, b := pair(t)
	if e := h.Act(b.Token, Action{Type: "start"}); e == nil {
		t.Fatal("non-host started")
	}
	if e := h.Act(a.Token, Action{Type: "start"}); e == nil {
		t.Fatal("unready start")
	}
	must(t, h, b, Action{Type: "ready"})
	must(t, h, a, Action{Type: "start"})
	s, _ := h.State(a.Token)
	if s.Phase != "playing" || len(s.Beacons) != 5 {
		t.Fatal("not started")
	}
	if _, e := h.Join(a.Code, "Late"); e == nil {
		t.Fatal("late join allowed")
	}
	if e := h.Act(b.Token, Action{Type: "reset"}); e == nil {
		t.Fatal("non-host reset")
	}
	must(t, h, a, Action{Type: "reset"})
	s, _ = h.State(a.Token)
	if s.Phase != "lobby" || s.Players[1].Ready {
		t.Fatal("bad reset")
	}
	if e := h.Act(b.Token, Action{Type: "kick", Target: a.PlayerID}); e == nil {
		t.Fatal("non-host kicked")
	}
	must(t, h, a, Action{Type: "leave"})
	s, _ = h.State(b.Token)
	if s.Host != b.PlayerID || len(s.Players) != 1 {
		t.Fatal("host not transferred")
	}
	must(t, h, b, Action{Type: "leave"})
	if len(h.rooms) != 0 || h.Valid(a.Token) || h.Valid(b.Token) {
		t.Fatal("room or sessions leaked")
	}
}
func TestMovementNormalizationAndTimeout(t *testing.T) {
	h, a, b := pair(t)
	now := time.Now()
	h.Now = func() time.Time { return now }
	must(t, h, b, Action{Type: "ready"})
	must(t, h, a, Action{Type: "start"})
	must(t, h, a, Action{Type: "move", X: 999, Y: 999})
	h.Tick(time.Second)
	s, _ := h.State(a.Token)
	distance := math.Hypot(s.Players[0].X-90, s.Players[0].Y-65)
	if math.Abs(distance-18) > .001 {
		t.Fatalf("server movement cap failed: %f", distance)
	}
	x := s.Players[0].X
	now = now.Add(time.Second)
	h.Tick(50 * time.Millisecond)
	s, _ = h.State(a.Token)
	if s.Players[0].X != x {
		t.Fatal("stale input kept moving")
	}
	if e := h.Act(a.Token, Action{Type: "move", X: math.NaN()}); e == nil {
		t.Fatal("NaN accepted")
	}
	r, p, _ := h.find(a.Token)
	p.X = 200
	p.Y = 170
	p.dx = 1
	p.dy = 0
	p.inputAt = now
	r.beacons = nil
	h.Tick(100 * time.Millisecond)
	if p.X != 200 {
		t.Fatal("wall collision missed")
	}
	p.X = Width - Radius
	p.Y = 65
	h.Tick(50 * time.Millisecond)
	if p.X > Width-Radius {
		t.Fatal("boundary crossed")
	}
}
func TestScoringAndReset(t *testing.T) {
	h, a, b := pair(t)
	must(t, h, b, Action{Type: "ready"})
	must(t, h, a, Action{Type: "start"})
	r, p, _ := h.find(a.Token)
	p.Score = 9
	r.beacons = []Point{{p.X, p.Y}}
	must(t, h, a, Action{Type: "move"})
	h.Tick(50 * time.Millisecond)
	s, _ := h.State(a.Token)
	if s.Phase != "finished" || s.Winner != a.PlayerID || s.Players[0].Score != 10 {
		t.Fatal("win not registered")
	}
	must(t, h, a, Action{Type: "reset"})
	s, _ = h.State(a.Token)
	if s.Winner != "" || s.Players[0].Score != 0 || len(s.Beacons) != 0 {
		t.Fatal("reset kept score")
	}
	for i := 0; i < 100; i++ {
		p := spawn()
		if !clearAt(p.X, p.Y, 28) {
			t.Fatal("beacon in wall")
		}
	}
}
func TestReconnectEpochAndExpiry(t *testing.T) {
	h, a, b := pair(t)
	now := time.Now()
	h.Now = func() time.Time { return now }
	old, e1, _ := h.Subscribe(a.Token)
	_, e2, _ := h.Subscribe(a.Token)
	for range old {
	}
	h.Detach(a.Token, e1)
	s, _ := h.State(a.Token)
	if !s.Players[0].Connected {
		t.Fatal("stale stream disconnected replacement")
	}
	h.Detach(a.Token, e2)
	now = now.Add(14 * time.Second)
	h.Tick(50 * time.Millisecond)
	if !h.Valid(a.Token) {
		t.Fatal("expired before grace")
	}
	_, e3, e := h.Subscribe(a.Token)
	if e != nil {
		t.Fatal(e)
	}
	h.Detach(a.Token, e3)
	now = now.Add(Grace + time.Millisecond)
	h.Tick(50 * time.Millisecond)
	if h.Valid(a.Token) {
		t.Fatal("not expired")
	}
	s, _ = h.State(b.Token)
	if s.Host != b.PlayerID {
		t.Fatal("host not reassigned on expiry")
	}
}
func TestKickAndCapacity(t *testing.T) {
	h, a, b := pair(t)
	for i := 0; i < 4; i++ {
		if _, e := h.Join(a.Code, "Guest"); e != nil {
			t.Fatal(e)
		}
	}
	if _, e := h.Join(a.Code, "Overflow"); e == nil {
		t.Fatal("room overflow")
	}
	stream, _, _ := h.Subscribe(b.Token)
	must(t, h, a, Action{Type: "kick", Target: b.PlayerID})
	for range stream {
	}
	if h.Valid(b.Token) {
		t.Fatal("kick retained token")
	}
	if e := h.Act(a.Token, Action{Type: "kick", Target: a.PlayerID}); e == nil {
		t.Fatal("self kick")
	}
	for len(h.rooms) < MaxRooms {
		if _, e := h.Create("Host", "Room"); e != nil {
			t.Fatal(e)
		}
	}
	if _, e := h.Create("Host", "Too many"); e == nil {
		t.Fatal("server room overflow")
	}
}
func TestChatBoundsSecretsAndValidation(t *testing.T) {
	h, a, _ := pair(t)
	now := time.Now()
	h.Now = func() time.Time { return now }
	for i := 0; i < 65; i++ {
		now = now.Add(100 * time.Millisecond)
		must(t, h, a, Action{Type: "chat", Text: "<b>hello</b>"})
	}
	s, _ := h.State(a.Token)
	if len(s.Chat) != 60 {
		t.Fatal("chat unbounded")
	}
	data, _ := json.Marshal(s)
	if strings.Contains(string(data), a.Token) || strings.Contains(string(data), "\"token\"") {
		t.Fatal("private token leaked")
	}
	aToken := a.Token
	for _, a := range []Action{{Type: "chat", Text: ""}, {Type: "chat", Text: strings.Repeat("x", 161)}, {Type: "chat", Text: "line\nbreak"}, {Type: "unknown"}} {
		if e := h.Act(aToken, a); e == nil {
			t.Fatal("invalid action accepted")
		}
	}
	if _, e := h.Create("\n", "Room"); e == nil {
		t.Fatal("bad name")
	}
	if _, e := h.Join("INVALID", "Name"); e == nil {
		t.Fatal("bad room")
	}
	for i := 0; i < 50; i++ {
		h.Act(a.Token, Action{Type: "ready"})
	}
	if e := h.Act(a.Token, Action{Type: "ready"}); e == nil {
		t.Fatal("rate limit missing")
	}
}
func TestConcurrentSnapshotsAndActions(t *testing.T) {
	h, a, b := pair(t)
	var wg sync.WaitGroup
	for i := 0; i < 6; i++ {
		wg.Add(1)
		go func() {
			defer wg.Done()
			for j := 0; j < 50; j++ {
				h.State(a.Token)
				h.Act(b.Token, Action{Type: "ready"})
				h.Tick(50 * time.Millisecond)
			}
		}()
	}
	wg.Wait()
}
