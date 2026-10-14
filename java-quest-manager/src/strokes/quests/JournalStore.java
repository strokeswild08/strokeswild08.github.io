package strokes.quests;

import java.io.*;
import java.nio.file.*;
import java.util.Properties;

public final class JournalStore {
    private JournalStore() {}
    public static void save(QuestJournal journal, Path destination) throws IOException {
        Path target = destination.toAbsolutePath();
        Files.createDirectories(target.getParent());
        Path temp = Files.createTempFile(target.getParent(), "journal-", ".tmp");
        try {
            try (OutputStream out = Files.newOutputStream(temp)) {
                journal.snapshot().store(out, "Trail Ledger quest journal / format 1");
            }
            try { Files.move(temp, target, StandardCopyOption.ATOMIC_MOVE, StandardCopyOption.REPLACE_EXISTING); }
            catch (AtomicMoveNotSupportedException e) {
                Files.move(temp, target, StandardCopyOption.REPLACE_EXISTING);
            }
        } finally { Files.deleteIfExists(temp); }
    }
    public static void load(QuestJournal journal, Path source) throws IOException {
        Properties p = new Properties();
        try (InputStream in = Files.newInputStream(source)) { p.load(in); }
        try { journal.restore(p); }
        catch (IllegalArgumentException e) { throw new IOException("Invalid quest save: " + e.getMessage(), e); }
    }
}
