package shelf;
import java.io.*;
import java.nio.file.*;
import java.util.*;
public final class Exports {
    private Exports() {}
    private static String csv(String value) {
        if (!value.isEmpty() && "=+-@\t\r\n".indexOf(value.charAt(0))>=0) value="'"+value;
        return "\""+value.replace("\"","\"\"")+"\"";
    }
    private static String json(String value) {
        StringBuilder out=new StringBuilder("\"");
        for (char ch : value.toCharArray()) switch(ch) {
            case '"' -> out.append("\\\""); case '\\' -> out.append("\\\\"); case '\n' -> out.append("\\n"); case '\r' -> out.append("\\r"); case '\t' -> out.append("\\t");
            default -> { if(ch<32) out.append(String.format(Locale.ROOT,"\\u%04x",(int)ch)); else out.append(ch); }
        }
        return out.append('"').toString();
    }
    public static String csv(List<Catalog.Asset> assets, TagStore tags, Map<Path,String> duplicates) {
        StringBuilder out=new StringBuilder("path,type,bytes,modified,tags,duplicate_group\r\n");
        for (Catalog.Asset asset : assets) out.append(csv(asset.relative())).append(',').append(csv(asset.kind())).append(',').append(asset.size()).append(',').append(csv(asset.modified().toString())).append(',').append(csv(tags.get(asset.path()))).append(',').append(csv(duplicates.getOrDefault(asset.path(),""))).append("\r\n");
        return out.toString();
    }
    public static String json(List<Catalog.Asset> assets, TagStore tags, Map<Path,String> duplicates) {
        StringJoiner rows=new StringJoiner(",\n","{\"version\":1,\"assets\":[\n","\n]}\n");
        for(Catalog.Asset asset:assets) rows.add("  {\"path\":"+json(asset.relative())+",\"type\":"+json(asset.kind())+",\"bytes\":"+asset.size()+",\"modified\":"+json(asset.modified().toString())+",\"tags\":"+json(tags.get(asset.path()))+",\"duplicateGroup\":"+json(duplicates.getOrDefault(asset.path(),""))+"}");
        return rows.toString();
    }
    public static void save(Path path,String contents) throws IOException {
        Path absolute=path.toAbsolutePath().normalize();
        Path temp=Files.createTempFile(absolute.getParent(),"asset-shelf-export-",".tmp");
        try { Files.writeString(temp,contents); Files.move(temp,absolute); }
        finally { Files.deleteIfExists(temp); }
    }
}
