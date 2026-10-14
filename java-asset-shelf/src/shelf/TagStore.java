package shelf;
import java.io.*;
import java.nio.file.*;
import java.util.*;

public final class TagStore {
    private final Path root;
    private final Properties values = new Properties();
    public TagStore(Path root) throws IOException {
        this.root = root.toRealPath(); Path file = root.resolve("asset-shelf-tags.properties");
        if (Files.exists(file, LinkOption.NOFOLLOW_LINKS)) {
            if (!Files.isRegularFile(file, LinkOption.NOFOLLOW_LINKS) || Files.size(file)>1048576) throw new IOException("Tag file is invalid or larger than 1 MB.");
            try (Reader reader=Files.newBufferedReader(file)) { values.load(reader); }
        }
    }
    private String key(Path file) { return root.relativize(file.toAbsolutePath().normalize()).toString().replace(File.separatorChar,'/'); }
    public String get(Path file) { return values.getProperty(key(file),""); }
    public void set(Path file, String tags) throws IOException {
        if (tags.length()>500 || !tags.matches("[\\p{L}\\p{N} ,_-]*")) throw new IOException("Use letters, numbers, spaces, commas, underscores or hyphens (max 500 characters).");
        String clean = String.join(", ", Arrays.stream(tags.split(",")).map(String::trim).filter(s -> !s.isEmpty()).distinct().toList());
        Properties before = new Properties(); before.putAll(values);
        if (clean.isEmpty()) values.remove(key(file)); else values.setProperty(key(file),clean);
        try { save(); } catch (IOException error) { values.clear(); values.putAll(before); throw error; }
    }
    public void remap(List<RenameService.Change> changes, boolean reverse) throws IOException {
        Properties before = new Properties(); before.putAll(values);
        for (RenameService.Change change : changes) {
            String from = key(reverse ? change.target() : change.source());
            String to = key(reverse ? change.source() : change.target());
            String tags = values.getProperty(from); values.remove(from);
            if (tags!=null) values.setProperty(to,tags);
        }
        try { save(); } catch (IOException error) { values.clear(); values.putAll(before); throw error; }
    }
    private void save() throws IOException {
        Path temp=Files.createTempFile(root,"asset-shelf-tags-",".tmp");
        try {
            try (Writer writer=Files.newBufferedWriter(temp)) { values.store(writer,"Asset Shelf tags / relative paths"); }
            Path target=root.resolve("asset-shelf-tags.properties");
            try { Files.move(temp,target,StandardCopyOption.ATOMIC_MOVE,StandardCopyOption.REPLACE_EXISTING); }
            catch (AtomicMoveNotSupportedException error) { Files.move(temp,target,StandardCopyOption.REPLACE_EXISTING); }
        } finally { Files.deleteIfExists(temp); }
    }
}
