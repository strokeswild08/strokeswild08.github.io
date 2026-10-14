package shelf;

import java.io.*;
import java.nio.file.*;
import java.nio.file.attribute.BasicFileAttributes;
import java.security.*;
import java.time.Instant;
import java.util.*;
import java.util.function.Consumer;

public final class Catalog {
    private Catalog() {}
    public record Asset(Path path, String relative, String kind, long size, Instant modified) {}
    public record Scan(Path root, List<Asset> assets, List<String> warnings) {}
    private static final Set<String> IMAGES = Set.of("png","jpg","jpeg","gif","bmp","webp","tga","psd","aseprite","ase");
    private static final Set<String> AUDIO = Set.of("wav","mp3","ogg","flac","aiff");
    private static final Set<String> MODELS = Set.of("glb","gltf","fbx","obj","blend");
    public static String extension(Path path) {
        String name = path.getFileName().toString(); int dot = name.lastIndexOf('.');
        return dot < 0 ? "" : name.substring(dot+1).toLowerCase(Locale.ROOT);
    }
    public static String kind(Path path) {
        String ext = extension(path);
        return IMAGES.contains(ext) ? "Image" : AUDIO.contains(ext) ? "Audio" : MODELS.contains(ext) ? "Model" : "";
    }
    public static Scan scan(Path directory, Consumer<String> progress) throws IOException {
        Path root = directory.toRealPath();
        if (!Files.isDirectory(root)) throw new IOException("Choose a directory.");
        List<Asset> assets = new ArrayList<>(); List<String> warnings = new ArrayList<>();
        Files.walkFileTree(root, new SimpleFileVisitor<>() {
            @Override public FileVisitResult preVisitDirectory(Path dir, BasicFileAttributes attrs) throws IOException {
                if (Thread.currentThread().isInterrupted()) throw new InterruptedIOException("Scan cancelled.");
                if (!dir.equals(root) && (dir.getFileName().toString().startsWith(".") || Set.of("node_modules","target","build").contains(dir.getFileName().toString()))) return FileVisitResult.SKIP_SUBTREE;
                return FileVisitResult.CONTINUE;
            }
            @Override public FileVisitResult visitFile(Path file, BasicFileAttributes attrs) throws IOException {
                if (Thread.currentThread().isInterrupted()) throw new InterruptedIOException("Scan cancelled.");
                if (assets.size() >= 10000) { warnings.add("Stopped at 10,000 supported assets."); return FileVisitResult.TERMINATE; }
                String category = kind(file);
                if (attrs.isRegularFile() && !category.isEmpty()) {
                    assets.add(new Asset(file, root.relativize(file).toString().replace(File.separatorChar,'/'), category, attrs.size(), attrs.lastModifiedTime().toInstant()));
                    if (assets.size()%100 == 0) progress.accept("Found " + assets.size() + " assets…");
                }
                return FileVisitResult.CONTINUE;
            }
            @Override public FileVisitResult visitFileFailed(Path file, IOException error) {
                warnings.add(root.relativize(file) + ": " + error.getMessage()); return FileVisitResult.CONTINUE;
            }
        });
        assets.sort(Comparator.comparing(Asset::relative));
        return new Scan(root, List.copyOf(assets), List.copyOf(warnings));
    }
    public static String sha256(Path path) throws IOException {
        if (!Files.isRegularFile(path, LinkOption.NOFOLLOW_LINKS)) throw new IOException("Not a regular file: " + path);
        BasicFileAttributes before = Files.readAttributes(path, BasicFileAttributes.class, LinkOption.NOFOLLOW_LINKS);
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            try (InputStream input = Files.newInputStream(path, LinkOption.NOFOLLOW_LINKS)) {
                byte[] buffer = new byte[65536]; int read;
                while ((read = input.read(buffer)) != -1) {
                    if (Thread.currentThread().isInterrupted()) throw new InterruptedIOException("Hashing cancelled.");
                    digest.update(buffer,0,read);
                }
            }
            BasicFileAttributes after = Files.readAttributes(path, BasicFileAttributes.class, LinkOption.NOFOLLOW_LINKS);
            if (before.size()!=after.size() || !before.lastModifiedTime().equals(after.lastModifiedTime())) throw new IOException("File changed while hashing: " + path);
            return HexFormat.of().formatHex(digest.digest());
        } catch (NoSuchAlgorithmException error) { throw new IllegalStateException(error); }
    }
    public static Map<Path,String> duplicates(List<Asset> assets, Consumer<String> progress) throws IOException {
        Map<Long,List<Asset>> bySize = new TreeMap<>();
        for (Asset asset : assets) bySize.computeIfAbsent(asset.size(),key -> new ArrayList<>()).add(asset);
        Map<String,List<Path>> hashes = new TreeMap<>(); int checked=0;
        for (List<Asset> group : bySize.values()) if (group.size()>1) for (Asset asset : group) {
            String hash = sha256(asset.path());
            hashes.computeIfAbsent(hash,key -> new ArrayList<>()).add(asset.path());
            progress.accept("Hashed " + (++checked) + " candidate files…");
        }
        Map<Path,String> result = new HashMap<>(); int id=0;
        for (List<Path> group : hashes.values()) if (group.size()>1) {
            String label = "Group " + (++id);
            for (Path path : group) result.put(path,label);
        }
        return Map.copyOf(result);
    }
}
