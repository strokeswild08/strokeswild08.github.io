# Thread & Ink — Dialogue and Quest Workshop

**Every choice leaves a thread.** A visual branching dialogue editor and playable narrative preview by **Owais / Wild Strokes**.

**[Open the live workshop](https://strokeswild08.github.io/story-thread/)**

Build conversations on a warm case-file connection board. Write a scene, connect player choices, add inventory/flag/reputation/quest rules, then test the consequences in a live story preview. The included **The Glasshouse Letter** mystery demonstrates a complete quest with locked routes, alternate choices and a resolved ending.

## In the workshop

- Create, select, rename and drag scene cards. Follow directed SVG connections and find scenes in the index.
- Edit speakers, dialogue and player replies; connect choices through target-scene selectors.
- Choose the entry scene, mark ending scenes, and check structural reachability.
- Add up to five conditions and five effects to each choice.
- Undo/redo the last 40 edits. Restoring the sample or importing a file is also undoable.
- Play the story with visible locked-choice reasons, inventory, flags, reputation, quest journal and effect history.
- Undo a preview choice with full state restoration, or restart from the initial state.
- Export/import validated JSON blueprints. The current document is saved locally when browser storage is available.
- Use Fit board and zoom buttons for an overview. Drag cards or select one and use arrow keys to move it in 20-unit increments.

## Rules

| State | Conditions | Effects |
| --- | --- | --- |
| Inventory item | Has / lacks a named item | Give / remove an item |
| Story flag | Flag set / not set | Set / clear a flag |
| Reputation | At least a number | Add a signed number, clamped to −100…100 |
| Quest | Not started / active / complete | Set quest status |

All conditions on a choice must pass. Effects are applied only after an enabled choice is selected. State keys use lowercase letters, numbers and underscores and must start with a letter. Imported JSON can also define initial inventory, flags, reputation and quests; the UI edits choice-driven rules rather than initial-state entries.

## Try the sample

1. Open **Play the story** and choose to help find the missing botanist.
2. Take Mara's key, then unlock the study.
3. Bring the letter back and give it to Mara. The quest completes and reputation increases.
4. Restart and choose to look around first. The study is locked until the key is obtained. Try the hidden path to inspect other conditions.

## Run locally

```sh
cd story-thread
python3 -m http.server 8080
```

Open `http://localhost:8080`. No install, API key, account or build step is required. Serve over HTTP rather than opening the HTML directly so ES modules work.

## Tests

Node.js 20+ is sufficient; no dependencies are required.

```sh
npm test
```

Tests cover a complete quest path, alternate routes, locked choices, all state-rule types, immutable effects, reputation bounds, preview undo/restart, malformed import rejection, prototype-key rejection, graph diagnostics, deletion rules and bounded cycles.

## Structure

| File | Purpose |
| --- | --- |
| `src/model.js` | JSON schema validation, rule evaluation, state transitions and preview sessions |
| `src/app.js` | Board, inspector, drag/zoom, edit history, persistence and story preview |
| `style.css` | Responsive case-file interface and illustrated CSS portrait placeholder |
| `tests/model.test.js` | Offline tests using Node's built-in test runner |

This is a focused single-conversation authoring tool. Graph validation checks connections and structural reachability; it does not prove that every condition is satisfiable or every ending achievable. Cycles are supported, with a 100-choice preview limit. Documents support 60 scenes, six choices per scene and a 1 MB import limit. Deleting an entry scene or a scene with incoming choices is blocked until those connections are updated. No executable scripts, collaboration server, engine plugin, cloud storage or automatic file synchronization are included. JSON is a portable story blueprint; an engine integration would need a small runtime adapter. The portrait is a shared illustrative placeholder, not custom character art.
