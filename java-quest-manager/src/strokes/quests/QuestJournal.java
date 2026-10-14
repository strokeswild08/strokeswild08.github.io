package strokes.quests;

import java.util.*;

/** Single-player journal. Call from one game thread; UI access uses the Swing EDT. */
public final class QuestJournal {
    public enum Status { LOCKED, AVAILABLE, ACTIVE, READY, CLAIMED }
    public record Event(Quest.Kind kind, String target, int amount) {
        public Event {
            Objects.requireNonNull(kind); Quest.token(target);
            if (amount <= 0) throw new IllegalArgumentException("Event amount must be positive");
        }
    }
    public record View(Quest quest, Status status, Map<String, Integer> progress) {}
    private final LinkedHashMap<String, Quest> definitions = new LinkedHashMap<>();
    private final Map<String, Map<String, Integer>> progress = new HashMap<>();
    private final Set<String> accepted = new HashSet<>(), claimed = new HashSet<>();

    public QuestJournal(List<Quest> quests) {
        for (Quest q : quests) {
            if (definitions.putIfAbsent(q.id(), q) != null)
                throw new IllegalArgumentException("Duplicate quest: " + q.id());
            Map<String, Integer> counts = new LinkedHashMap<>();
            q.objectives().forEach(o -> counts.put(o.id(), 0));
            progress.put(q.id(), counts);
        }
        for (Quest q : quests) for (String id : q.requires()) quest(id);
        for (Quest q : quests) visit(q.id(), new HashSet<>(), new HashSet<>());
    }
    private void visit(String id, Set<String> visiting, Set<String> done) {
        if (done.contains(id)) return;
        if (!visiting.add(id)) throw new IllegalArgumentException("Quest prerequisite cycle");
        for (String parent : quest(id).requires()) visit(parent, visiting, done);
        visiting.remove(id); done.add(id);
    }
    public Quest quest(String id) {
        Quest q = definitions.get(id);
        if (q == null) throw new IllegalArgumentException("Unknown quest: " + id);
        return q;
    }
    public Status status(String id) {
        Quest q = quest(id);
        if (claimed.contains(id)) return Status.CLAIMED;
        if (!accepted.contains(id))
            return claimed.containsAll(q.requires()) ? Status.AVAILABLE : Status.LOCKED;
        return q.objectives().stream().allMatch(o -> progress.get(id).get(o.id()) == o.required())
            ? Status.READY : Status.ACTIVE;
    }
    public void accept(String id) {
        if (status(id) != Status.AVAILABLE) throw new IllegalStateException("Quest is not available");
        accepted.add(id);
    }
    /** An event advances every matching objective in active quests; old events are not replayed. */
    public List<String> record(Event event) {
        List<String> changed = new ArrayList<>();
        for (Quest q : definitions.values()) {
            if (status(q.id()) != Status.ACTIVE) continue;
            boolean updated = false;
            for (Quest.Objective o : q.objectives()) {
                if (o.kind() != event.kind() || !o.target().equals(event.target())) continue;
                int old = progress.get(q.id()).get(o.id());
                int next = (int) Math.min(o.required(), (long) old + event.amount());
                progress.get(q.id()).put(o.id(), next);
                updated |= old != next;
            }
            if (updated) changed.add(q.id());
        }
        return List.copyOf(changed);
    }
    public Quest.Reward claim(String id) {
        if (status(id) != Status.READY) throw new IllegalStateException("Finish the quest before claiming");
        claimed.add(id);
        return quest(id).reward();
    }
    public long gold() { return claimed.stream().mapToLong(id -> quest(id).reward().gold()).sum(); }
    public long experience() { return claimed.stream().mapToLong(id -> quest(id).reward().experience()).sum(); }
    public List<View> views() {
        return definitions.values().stream().map(q -> new View(q, status(q.id()),
            Collections.unmodifiableMap(new LinkedHashMap<>(progress.get(q.id()))))).toList();
    }
    Properties snapshot() {
        Properties p = new Properties(); p.setProperty("format", "1");
        for (Quest q : definitions.values()) {
            p.setProperty(q.id() + ".status", status(q.id()).name());
            for (Quest.Objective o : q.objectives())
                p.setProperty(q.id() + "." + o.id(), progress.get(q.id()).get(o.id()).toString());
        }
        return p;
    }
    /** Validate into a fresh journal, then commit: a failed load cannot partially replace state. */
    void restore(Properties p) {
        if (!"1".equals(p.getProperty("format"))) throw new IllegalArgumentException("Unsupported save format");
        QuestJournal candidate = new QuestJournal(new ArrayList<>(definitions.values()));
        if (!p.stringPropertyNames().equals(snapshot().stringPropertyNames()))
            throw new IllegalArgumentException("Save does not match this quest catalog");
        for (Quest q : definitions.values()) {
            Status saved = Status.valueOf(p.getProperty(q.id() + ".status"));
            if (saved == Status.ACTIVE || saved == Status.READY || saved == Status.CLAIMED)
                candidate.accepted.add(q.id());
            if (saved == Status.CLAIMED) candidate.claimed.add(q.id());
            for (Quest.Objective o : q.objectives()) {
                int count = Integer.parseInt(p.getProperty(q.id() + "." + o.id()));
                if (count < 0 || count > o.required() || (!candidate.accepted.contains(q.id()) && count != 0))
                    throw new IllegalArgumentException("Invalid saved progress: " + q.id());
                candidate.progress.get(q.id()).put(o.id(), count);
            }
        }
        for (Quest q : definitions.values()) {
            Status saved = Status.valueOf(p.getProperty(q.id() + ".status"));
            boolean complete = q.objectives().stream().allMatch(o ->
                candidate.progress.get(q.id()).get(o.id()) == o.required());
            if (candidate.status(q.id()) != saved
                || (candidate.accepted.contains(q.id()) && !candidate.claimed.containsAll(q.requires()))
                || (saved == Status.CLAIMED && !complete))
                throw new IllegalArgumentException("Inconsistent saved quest: " + q.id());
        }
        accepted.clear(); accepted.addAll(candidate.accepted);
        claimed.clear(); claimed.addAll(candidate.claimed);
        progress.clear(); progress.putAll(candidate.progress);
    }
}
