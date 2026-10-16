// Package lobby owns room state and advances an authoritative arena simulation.
package lobby

import (
	"crypto/rand"
	"encoding/hex"
	"encoding/json"
	"errors"
	"math"
	mathrand "math/rand/v2"
	"strings"
	"sync"
	"time"
	"unicode"
	"unicode/utf8"
)

const Width = 900
const Height = 520
const Radius = 12
const Speed = 180
const Target = 10
const Grace = 15 * time.Second
const MaxRooms = 32

type Player struct {
	ID        string  `json:"id"`
	Name      string  `json:"name"`
	Color     string  `json:"color"`
	Ready     bool    `json:"ready"`
	Connected bool    `json:"connected"`
	X         float64 `json:"x"`
	Y         float64 `json:"y"`
	Score     int     `json:"score"`
}
type Point struct {
	X float64 `json:"x"`
	Y float64 `json:"y"`
}
type Wall struct {
	X float64 `json:"x"`
	Y float64 `json:"y"`
	W float64 `json:"w"`
	H float64 `json:"h"`
}

var arenaWalls = []Wall{{220, 150, 100, 42}, {580, 330, 100, 42}, {420, 220, 60, 80}}
var colors = []string{"#f6ac69", "#86c9cd", "#c7b5f5", "#c0d280", "#ed96b0", "#84acfa"}

type Chat struct {
	Name string `json:"name"`
	Text string `json:"text"`
	At   int64  `json:"at"`
}
type Snapshot struct {
	Code    string   `json:"code"`
	Name    string   `json:"name"`
	Host    string   `json:"host"`
	Phase   string   `json:"phase"`
	Winner  string   `json:"winner"`
	Players []Player `json:"players"`
	Chat    []Chat   `json:"chat"`
	Beacons []Point  `json:"beacons"`
	Walls   []Wall   `json:"walls"`
	Target  int      `json:"target"`
	Tick    uint64   `json:"tick"`
}
type Session struct {
	Token    string `json:"token"`
	PlayerID string `json:"playerId"`
	Code     string `json:"code"`
}
type member struct {
	Player
	token   string
	dx, dy  float64
	inputAt time.Time
	seen    time.Time
	window  time.Time
	actions int
	stream  chan []byte
	epoch   uint64
}
type room struct {
	code, name, host, phase, winner string
	players                         []*member
	chat                            []Chat
	beacons                         []Point
	tick                            uint64
}
type Hub struct {
	mu       sync.Mutex
	rooms    map[string]*room
	sessions map[string]*room
	Now      func() time.Time
}

func New() *Hub { return &Hub{rooms: map[string]*room{}, sessions: map[string]*room{}, Now: time.Now} }
func secret(n int) string {
	b := make([]byte, n)
	if _, e := rand.Read(b); e != nil {
		panic(e)
	}
	return hex.EncodeToString(b)
}
func clean(s string, max int) (string, error) {
	s = strings.TrimSpace(s)
	if s == "" || !utf8.ValidString(s) || utf8.RuneCountInString(s) > max {
		return "", errors.New("text is empty or too long")
	}
	for _, r := range s {
		if unicode.IsControl(r) {
			return "", errors.New("control characters are not allowed")
		}
	}
	return s, nil
}
func (h *Hub) Create(name, title string) (Session, error) {
	h.mu.Lock()
	defer h.mu.Unlock()
	var e error
	name, e = clean(name, 20)
	if e != nil {
		return Session{}, e
	}
	title, e = clean(title, 32)
	if e != nil {
		return Session{}, e
	}
	if len(h.rooms) >= MaxRooms {
		return Session{}, errors.New("server room limit reached")
	}
	code := strings.ToUpper(secret(3))
	for h.rooms[code] != nil {
		code = strings.ToUpper(secret(3))
	}
	r := &room{code: code, name: title, phase: "lobby", chat: []Chat{}, beacons: []Point{}}
	h.rooms[code] = r
	p := h.add(r, name)
	r.host = p.ID
	p.Ready = true
	return Session{p.token, p.ID, code}, nil
}
func (h *Hub) add(r *room, name string) *member {
	used := map[string]bool{}
	for _, p := range r.players {
		used[p.Color] = true
	}
	color := colors[0]
	for _, c := range colors {
		if !used[c] {
			color = c
			break
		}
	}
	p := &member{Player: Player{ID: secret(5), Name: name, Color: color, X: 90 + float64(len(r.players))*120, Y: 65}, token: secret(24), seen: h.Now()}
	r.players = append(r.players, p)
	h.sessions[p.token] = r
	return p
}
func (h *Hub) Join(code, name string) (Session, error) {
	h.mu.Lock()
	defer h.mu.Unlock()
	name, e := clean(name, 20)
	if e != nil {
		return Session{}, e
	}
	r := h.rooms[strings.ToUpper(strings.TrimSpace(code))]
	if r == nil {
		return Session{}, errors.New("room not found")
	}
	if r.phase != "lobby" {
		return Session{}, errors.New("match already started")
	}
	if len(r.players) >= 6 {
		return Session{}, errors.New("room is full (6 players)")
	}
	p := h.add(r, name)
	h.publish(r)
	return Session{p.token, p.ID, r.code}, nil
}
func (h *Hub) find(token string) (*room, *member, error) {
	r := h.sessions[token]
	if r != nil {
		for _, p := range r.players {
			if p.token == token {
				return r, p, nil
			}
		}
	}
	return nil, nil, errors.New("session expired; create or join a room")
}
func (h *Hub) Valid(token string) bool {
	h.mu.Lock()
	defer h.mu.Unlock()
	_, _, e := h.find(token)
	return e == nil
}
func (h *Hub) Subscribe(token string) (<-chan []byte, uint64, error) {
	h.mu.Lock()
	defer h.mu.Unlock()
	r, p, e := h.find(token)
	if e != nil {
		return nil, 0, e
	}
	if p.stream != nil {
		close(p.stream)
	}
	p.stream = make(chan []byte, 1)
	p.epoch++
	p.Connected = true
	p.seen = h.Now()
	h.publish(r)
	return p.stream, p.epoch, nil
}
func (h *Hub) Detach(token string, epoch uint64) {
	h.mu.Lock()
	defer h.mu.Unlock()
	r, p, e := h.find(token)
	if e != nil || p.epoch != epoch {
		return
	}
	p.stream = nil
	p.Connected = false
	p.seen = h.Now()
	p.dx = 0
	p.dy = 0
	h.publish(r)
}
func snapshot(r *room) Snapshot {
	s := Snapshot{Code: r.code, Name: r.name, Host: r.host, Phase: r.phase, Winner: r.winner, Players: []Player{}, Chat: append([]Chat{}, r.chat...), Beacons: append([]Point{}, r.beacons...), Walls: append([]Wall{}, arenaWalls...), Target: Target, Tick: r.tick}
	for _, p := range r.players {
		s.Players = append(s.Players, p.Player)
	}
	return s
}
func (h *Hub) State(token string) (Snapshot, error) {
	h.mu.Lock()
	defer h.mu.Unlock()
	r, _, e := h.find(token)
	if e != nil {
		return Snapshot{}, e
	}
	return snapshot(r), nil
}
func (h *Hub) publish(r *room) {
	data, _ := json.Marshal(snapshot(r))
	for _, p := range r.players {
		if p.stream == nil {
			continue
		}
		select {
		case p.stream <- data:
		default:
			select {
			case <-p.stream:
			default:
			}
			select {
			case p.stream <- data:
			default:
			}
		}
	}
}
func (h *Hub) remove(r *room, p *member) {
	delete(h.sessions, p.token)
	if p.stream != nil {
		close(p.stream)
		p.stream = nil
	}
	for i, q := range r.players {
		if q == p {
			r.players = append(r.players[:i], r.players[i+1:]...)
			break
		}
	}
	if len(r.players) == 0 {
		delete(h.rooms, r.code)
		return
	}
	if r.host == p.ID {
		r.host = r.players[0].ID
		r.players[0].Ready = true
	}
	h.publish(r)
}

type Action struct {
	Type   string  `json:"type"`
	Text   string  `json:"text"`
	Target string  `json:"target"`
	X      float64 `json:"x"`
	Y      float64 `json:"y"`
}

func (h *Hub) Act(token string, a Action) error {
	h.mu.Lock()
	defer h.mu.Unlock()
	r, p, e := h.find(token)
	if e != nil {
		return e
	}
	if h.Now().Sub(p.window) >= time.Second {
		p.window = h.Now()
		p.actions = 0
	}
	p.actions++
	if p.actions > 40 {
		return errors.New("too many actions; wait a second")
	}
	switch a.Type {
	case "ready":
		if r.phase != "lobby" {
			return errors.New("match is not in lobby")
		}
		p.Ready = !p.Ready
	case "chat":
		text, e := clean(a.Text, 160)
		if e != nil {
			return e
		}
		r.chat = append(r.chat, Chat{p.Name, text, h.Now().UnixMilli()})
		if len(r.chat) > 60 {
			r.chat = r.chat[len(r.chat)-60:]
		}
	case "start":
		if p.ID != r.host {
			return errors.New("only the host can start")
		}
		if r.phase != "lobby" || len(r.players) < 2 {
			return errors.New("need at least two players in the lobby")
		}
		for _, q := range r.players {
			if !q.Ready || !q.Connected {
				return errors.New("all players must be connected and ready")
			}
		}
		r.phase = "playing"
		r.winner = ""
		r.beacons = []Point{}
		for i := 0; i < 5; i++ {
			r.beacons = append(r.beacons, spawn())
		}
		for i, q := range r.players {
			q.Score = 0
			q.X = 90 + float64(i)*120
			q.Y = 65
			q.dx = 0
			q.dy = 0
		}
	case "reset":
		if p.ID != r.host {
			return errors.New("only the host can reset")
		}
		r.phase = "lobby"
		r.winner = ""
		r.beacons = []Point{}
		for _, q := range r.players {
			q.Ready = q.ID == r.host
			q.dx = 0
			q.dy = 0
			q.Score = 0
		}
	case "kick":
		if p.ID != r.host {
			return errors.New("only the host can kick")
		}
		if a.Target == p.ID {
			return errors.New("use leave to leave your room")
		}
		for _, q := range r.players {
			if q.ID == a.Target {
				h.remove(r, q)
				return nil
			}
		}
		return errors.New("player not found")
	case "leave":
		h.remove(r, p)
		return nil
	case "move":
		if r.phase != "playing" || !p.Connected {
			return nil
		}
		if math.IsNaN(a.X) || math.IsNaN(a.Y) || math.IsInf(a.X, 0) || math.IsInf(a.Y, 0) {
			return errors.New("invalid movement")
		}
		p.dx = math.Max(-1, math.Min(1, a.X))
		p.dy = math.Max(-1, math.Min(1, a.Y))
		n := math.Hypot(p.dx, p.dy)
		if n > 1 {
			p.dx /= n
			p.dy /= n
		}
		p.inputAt = h.Now()
		return nil
	default:
		return errors.New("unknown action")
	}
	h.publish(r)
	return nil
}
func clearAt(x, y, radius float64) bool {
	if x < radius || y < radius || x > Width-radius || y > Height-radius {
		return false
	}
	for _, w := range arenaWalls {
		cx := math.Max(w.X, math.Min(x, w.X+w.W))
		cy := math.Max(w.Y, math.Min(y, w.Y+w.H))
		if math.Hypot(x-cx, y-cy) < radius {
			return false
		}
	}
	return true
}
func spawn() Point {
	for {
		p := Point{40 + mathrand.Float64()*(Width-80), 40 + mathrand.Float64()*(Height-80)}
		if clearAt(p.X, p.Y, 28) {
			return p
		}
	}
}

// Tick caps elapsed simulation time so a delayed tick never causes a teleport.
func (h *Hub) Tick(dt time.Duration) {
	h.mu.Lock()
	defer h.mu.Unlock()
	seconds := math.Max(0, math.Min(dt.Seconds(), .1))
	now := h.Now()
	for _, r := range h.rooms {
		for _, p := range append([]*member{}, r.players...) {
			if !p.Connected && now.Sub(p.seen) > Grace {
				h.remove(r, p)
			}
		}
		if len(r.players) == 0 {
			continue
		}
		r.tick++
		if r.phase == "playing" {
			for _, p := range r.players {
				if !p.Connected || now.Sub(p.inputAt) > 350*time.Millisecond {
					continue
				}
				nx := p.X + p.dx*Speed*seconds
				ny := p.Y + p.dy*Speed*seconds
				if clearAt(nx, p.Y, Radius) {
					p.X = nx
				}
				if clearAt(p.X, ny, Radius) {
					p.Y = ny
				}
				for i, b := range r.beacons {
					if math.Hypot(p.X-b.X, p.Y-b.Y) < 22 {
						p.Score++
						r.beacons[i] = spawn()
						if p.Score >= Target {
							r.phase = "finished"
							r.winner = p.ID
							break
						}
					}
				}
				if r.phase == "finished" {
					break
				}
			}
		}
		if r.tick%2 == 0 {
			h.publish(r)
		}
	}
}
