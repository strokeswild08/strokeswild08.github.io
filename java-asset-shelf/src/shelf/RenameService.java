package shelf;
import java.io.*;
import java.nio.file.*;
import java.util.*;

public final class RenameService {
    private RenameService() {}
    public record Change(Path source, Path target, String hash) {}
    public record Plan(Path root, List<Change> changes) {}
    @FunctionalInterface public interface Mover { void move(Path source, Path target) throws IOException; }
    public static Plan plan(Path directory, List<Path> selected, String prefix) throws IOException {
        if (!prefix.matches("[A-Za-z0-9][A-Za-z0-9_-]{0,39}")) throw new IOException("Prefix: 1–40 ASCII letters, digits, hyphens or underscores. Start with a letter or digit.");
        Path root=directory.toRealPath(); List<Path> paths=selected.stream().map(p->p.toAbsolutePath().normalize()).distinct().sorted().toList();
        if (paths.isEmpty() || paths.size()>1000) throw new IOException("Select 1–1000 assets to rename.");
        List<Change> changes=new ArrayList<>(); int number=0;
        for (Path source : paths) {
            guard(root,source);
            String filename=source.getFileName().toString(); int dot=filename.lastIndexOf('.');
            String extension=dot<0 ? "" : filename.substring(dot);
            Path target=source.resolveSibling(String.format(Locale.ROOT,"%s_%03d%s",prefix,++number,extension));
            if (!source.equals(target)) changes.add(new Change(source,target,Catalog.sha256(source)));
        }
        Plan plan=new Plan(root,List.copyOf(changes)); validate(plan); return plan;
    }
    private static void guard(Path root, Path source) throws IOException {
        if (!source.startsWith(root) || !Files.isRegularFile(source,LinkOption.NOFOLLOW_LINKS) || !source.getParent().toRealPath().equals(source.getParent())) throw new IOException("Path outside root, missing or linked: " + source);
    }
    private static void validate(Plan plan) throws IOException {
        Set<String> names=new HashSet<>();
        for (Change change : plan.changes()) {
            guard(plan.root(),change.source());
            if (!change.target().getParent().equals(change.source().getParent())) throw new IOException("Renames must stay in the same directory.");
            if (!names.add(change.target().toString().toLowerCase(Locale.ROOT))) throw new IOException("Duplicate destination: " + change.target());
            if (Files.exists(change.target(),LinkOption.NOFOLLOW_LINKS)) throw new IOException("Destination already exists: " + change.target().getFileName());
            // Also reject case-only conflicts for portability to Windows/macOS.
            try (var siblings=Files.list(change.target().getParent())) {
                if (siblings.anyMatch(p->p.getFileName().toString().equalsIgnoreCase(change.target().getFileName().toString()))) throw new IOException("Case-insensitive destination conflict: " + change.target());
            }
            if (!Catalog.sha256(change.source()).equals(change.hash())) throw new IOException("File changed since preview: " + change.source());
        }
    }
    public static void apply(Plan plan) throws IOException { apply(plan,(source,target)->Files.move(source,target)); }
    static void apply(Plan plan, Mover mover) throws IOException {
        validate(plan); List<Change> moved=new ArrayList<>();
        try {
            for (Change change : plan.changes()) { mover.move(change.source(),change.target()); moved.add(change); }
        } catch (IOException error) {
            List<String> failed=new ArrayList<>(); Collections.reverse(moved);
            for (Change change : moved) try { mover.move(change.target(),change.source()); } catch (IOException rollback) { failed.add(change.target()+" → "+change.source()); }
            throw new IOException(failed.isEmpty() ? "Rename failed; completed moves rolled back. " + error.getMessage() : "Rename failed; manual recovery required for: " + String.join("; ",failed),error);
        }
    }
    public static void undo(Plan plan) throws IOException {
        List<Change> reverse=new ArrayList<>();
        for (Change change : plan.changes()) reverse.add(new Change(change.target(),change.source(),change.hash()));
        apply(new Plan(plan.root(),List.copyOf(reverse)));
    }
}
