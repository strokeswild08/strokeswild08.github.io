package strokes.quests;

import java.nio.file.*;
import java.util.*;

/** Dependency-free regression checks; throws on failure even when assertions are disabled. */
public final class JournalTests {
    private static int checks;
    private static void check(boolean value, String label) {
        checks++; if (!value) throw new AssertionError(label);
    }
    private static void rejects(Runnable operation, String label) {
        try { operation.run(); } catch (IllegalArgumentException | IllegalStateException expected) { checks++; return; }
        throw new AssertionError(label);
    }
    private static void event(QuestJournal j, Quest.Kind kind, String target, int count) {
        j.record(new QuestJournal.Event(kind, target, count));
    }
    private static void supplies(QuestJournal j) {
        j.accept("supplies"); event(j, Quest.Kind.COLLECT, "reed", 3); event(j, Quest.Kind.VISIT, "bridge", 1);
    }
    public static void main(String[] args) throws Exception {
        QuestJournal j = new QuestJournal(Catalog.demo());
        check(j.status("beacon") == QuestJournal.Status.LOCKED, "prerequisites lock quests");
        rejects(() -> j.accept("beacon"), "locked accept");
        event(j, Quest.Kind.COLLECT, "reed", 3); j.accept("supplies");
        check(j.views().get(0).progress().get("reeds") == 0, "events before accept ignored");
        rejects(() -> j.accept("supplies"), "duplicate accept");
        rejects(() -> j.claim("supplies"), "early reward");
        event(j, Quest.Kind.DEFEAT, "reed", 100);
        check(j.views().get(0).progress().get("reeds") == 0, "kind must match");
        event(j, Quest.Kind.COLLECT, "reed", Integer.MAX_VALUE);
        check(j.views().get(0).progress().get("reeds") == 3, "count clamps without overflow");
        event(j, Quest.Kind.VISIT, "bridge", 1);
        check(j.status("supplies") == QuestJournal.Status.READY, "all objectives required");
        check(j.status("beacon") == QuestJournal.Status.LOCKED, "claim required to unlock");
        j.claim("supplies"); rejects(() -> j.claim("supplies"), "reward claimed once");
        check(j.gold() == 40 && j.experience() == 80, "wallet totals");
        j.accept("beacon"); event(j, Quest.Kind.VISIT, "ridge", 1);
        Path dir = Files.createTempDirectory("trail-ledger-tests-"); Path file = dir.resolve("save.properties");
        try {
            JournalStore.save(j, file); QuestJournal loaded = new QuestJournal(Catalog.demo());
            JournalStore.load(loaded, file);
            check(loaded.snapshot().equals(j.snapshot()), "save/load exact round trip");
            rejects(() -> loaded.claim("supplies"), "claim protection survives reload");
            Properties bad = j.snapshot(); bad.setProperty("beacon.ridge", "-1");
            Properties before = j.snapshot(); Properties negative = bad;
            rejects(() -> j.restore(negative), "negative progress rejected");
            check(j.snapshot().equals(before), "failed restore preserves live journal");
            bad = j.snapshot(); bad.setProperty("supplies.reeds", "2");
            Properties incomplete = bad; rejects(() -> j.restore(incomplete), "claimed incomplete rejected");
            bad = j.snapshot(); bad.setProperty("wolves.status", "CLAIMED"); bad.setProperty("wolves.wolves", "2");
            bad.setProperty("courier.status", "ACTIVE"); Properties forged = bad;
            rejects(() -> j.restore(forged), "accepted locked quest rejected");
            Files.writeString(file, "format=7\n");
            try { JournalStore.load(j, file); throw new AssertionError("invalid file accepted"); }
            catch (java.io.IOException expected) { checks++; }
            check(j.snapshot().equals(before), "invalid file is transactional");
            event(loaded, Quest.Kind.TALK, "mara", 1); loaded.claim("beacon");
            loaded.accept("wolves"); event(loaded, Quest.Kind.DEFEAT, "wolf", 2); loaded.claim("wolves");
            check(loaded.status("courier") == QuestJournal.Status.AVAILABLE, "multiple prerequisites");
            loaded.accept("courier"); event(loaded, Quest.Kind.TALK, "courier", 1); loaded.claim("courier");
            check(loaded.gold() == 335 && loaded.experience() == 600, "complete campaign wallet");
            JournalStore.save(loaded, file); JournalStore.load(j, file);
            check(j.snapshot().equals(loaded.snapshot()), "replacement save round trip");
        } finally { Files.deleteIfExists(file); Files.deleteIfExists(dir); }
        rejects(() -> new QuestJournal.Event(Quest.Kind.COLLECT, "reed", 0), "zero event rejected");
        rejects(() -> j.status("unknown"), "unknown quest rejected");
        Quest q = Catalog.demo().get(0);
        rejects(() -> new QuestJournal(List.of(q, q)), "duplicate quest rejected");
        Quest loop = new Quest("loop", "Loop", "Cycle", List.of("loop"), q.objectives(), q.reward());
        rejects(() -> new QuestJournal(List.of(loop)), "cycle rejected");
        Quest missing = new Quest("missing", "Missing", "Bad prerequisite", List.of("absent"), q.objectives(), q.reward());
        rejects(() -> new QuestJournal(List.of(missing)), "missing prerequisite rejected");
        Quest parallel = new Quest("parallel", "Shared target", "Same event", List.of(), q.objectives(), q.reward());
        QuestJournal shared = new QuestJournal(List.of(q, parallel)); shared.accept(q.id()); shared.accept(parallel.id());
        check(shared.record(new QuestJournal.Event(Quest.Kind.COLLECT, "reed", 1)).size() == 2, "shared event advances both quests");
        System.out.println("PASS / " + checks + " quest checks");
    }
}
