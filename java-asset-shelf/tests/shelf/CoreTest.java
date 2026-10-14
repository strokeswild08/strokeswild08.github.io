package shelf;
import java.nio.file.*;
import java.io.*;
import java.util.*;
import java.util.concurrent.atomic.AtomicInteger;

public final class CoreTest {
    private static int checks=0;
    private static void check(boolean value,String label){checks++;if(!value)throw new AssertionError(label);}
    private static void rejected(Throwing task,String label)throws Exception{checks++;try{task.run();throw new AssertionError(label);}catch(IOException expected){}}
    @FunctionalInterface private interface Throwing{void run()throws Exception;}
    public static void main(String[] args)throws Exception {
        Path root=Files.createTempDirectory("asset-shelf-core-");Path folder=Files.createDirectories(root.resolve("sprites"));
        Path a=Files.writeString(folder.resolve("a.png"),"same-content");Path b=Files.writeString(folder.resolve("b.png"),"same-content");Path c=Files.writeString(folder.resolve("c.png"),"diff-content");
        Files.writeString(root.resolve("notes.txt"),"ignore");Files.createDirectories(root.resolve(".hidden"));Files.writeString(root.resolve(".hidden/private.png"),"hidden");
        Catalog.Scan scan=Catalog.scan(root,text->{});check(scan.assets().size()==3,"Supported files only; hidden folder skipped");check(scan.assets().get(0).relative().equals("sprites/a.png"),"Stable relative ordering");
        Map<Path,String> duplicate=Catalog.duplicates(scan.assets(),text->{});check(duplicate.size()==2,"Same-size distinct content not duplicate");check(duplicate.get(a).equals(duplicate.get(b)),"Matching hashes share group");check(Catalog.sha256(a).length()==64,"SHA-256 digest");
        TagStore tags=new TagStore(root);tags.set(a,"hero, idle, hero");check(tags.get(a).equals("hero, idle"),"Tags deduplicated");check(new TagStore(root).get(a).equals("hero, idle"),"Tags reload from disk");rejected(()->tags.set(a,"<script>"),"Markup rejected");check(tags.get(a).equals("hero, idle"),"Rejected tags unchanged");
        RenameService.Plan plan=RenameService.plan(root,List.of(b,a),"unit");check(plan.changes().get(0).source().equals(a),"Rename plan deterministic");check(Files.exists(a)&&!Files.exists(folder.resolve("unit_001.png")),"Preview has no filesystem mutation");
        RenameService.apply(plan);tags.remap(plan.changes(),false);check(!Files.exists(a)&&Files.readString(folder.resolve("unit_001.png")).equals("same-content"),"Rename retains bytes");check(tags.get(folder.resolve("unit_001.png")).equals("hero, idle"),"Tags follow rename");
        RenameService.undo(plan);tags.remap(plan.changes(),true);check(Files.exists(a)&&Files.exists(b),"Undo restores names");check(tags.get(a).equals("hero, idle"),"Undo restores tags");
        Files.writeString(folder.resolve("occupied_001.png"),"must-survive");rejected(()->RenameService.plan(root,List.of(a),"occupied"),"Existing destinations blocked");check(Files.readString(folder.resolve("occupied_001.png")).equals("must-survive"),"No overwrite");
        Files.writeString(folder.resolve("CASE_001.PNG"),"case-survive");rejected(()->RenameService.plan(root,List.of(a),"case"),"Case-insensitive collision blocked");
        rejected(()->RenameService.plan(root,List.of(a),"../bad"),"Path prefix rejected");
        RenameService.Plan changed=RenameService.plan(root,List.of(a),"changed");Files.writeString(a,"external modification");rejected(()->RenameService.apply(changed),"Stale preview rejected");check(Files.exists(a),"Stale preview leaves source in place");Files.writeString(a,"same-content");
        RenameService.Plan undoChanged=RenameService.plan(root,List.of(a),"edited");RenameService.apply(undoChanged);Files.writeString(folder.resolve("edited_001.png"),"new bytes");rejected(()->RenameService.undo(undoChanged),"Undo refuses modified destination");check(!Files.exists(a)&&Files.exists(folder.resolve("edited_001.png")),"Failed undo does not overwrite");Files.move(folder.resolve("edited_001.png"),a);Files.writeString(a,"same-content");
        RenameService.Plan rollback=RenameService.plan(root,List.of(a,b,c),"rollback");AtomicInteger moves=new AtomicInteger();rejected(()->RenameService.apply(rollback,(from,to)->{if(moves.incrementAndGet()==2)throw new IOException("Injected failure");Files.move(from,to);}),"Mid-batch failure propagated");check(Files.exists(a)&&Files.exists(b)&&Files.exists(c),"Mid-batch failure rolls prior moves back");check(!Files.exists(folder.resolve("rollback_001.png")),"Rollback cleans destination");
        Path outside=Files.createTempFile("asset-shelf-outside-",".png");rejected(()->RenameService.plan(root,List.of(outside),"escape"),"Outside root rejected");
        boolean symlinkSupported=true;try{Files.createSymbolicLink(folder.resolve("linked.png"),outside);}catch(UnsupportedOperationException|IOException error){symlinkSupported=false;}
        if(symlinkSupported){check(Catalog.scan(root,text->{}).assets().stream().noneMatch(x->x.path().getFileName().toString().equals("linked.png")),"File symlinks skipped");rejected(()->RenameService.plan(root,List.of(folder.resolve("linked.png")),"linked"),"Linked rename source rejected");}
        Path formula=Files.writeString(folder.resolve("=formula.png"),"formula");Catalog.Scan exportScan=Catalog.scan(root,text->{});String csv=Exports.csv(exportScan.assets(),tags,duplicate);check(csv.contains("\"sprites/=formula.png\""),"Relative path CSV quoted");
        Catalog.Asset artificial=new Catalog.Asset(formula,"=1+1.png","Image",7,java.time.Instant.EPOCH);check(Exports.csv(List.of(artificial),tags,Map.of()).contains("\"'=1+1.png\""),"Spreadsheet formula prefix neutralized");
        String json=Exports.json(exportScan.assets(),tags,duplicate);check(json.contains("\"version\":1")&&json.contains("hero, idle"),"JSON fields exported");
        Path out=root.resolve("catalog.json");Exports.save(out,json);rejected(()->Exports.save(out,"overwrite"),"Export refuses overwrite");check(Files.readString(out).equals(json),"Existing export retained");
        if(args.length>0)Files.writeString(Path.of(args[0]),json);
        tags.set(a,"");check(new TagStore(root).get(a).isEmpty(),"Empty tags remove entry");
        System.out.println(checks+" filesystem integration checks passed.");
    }
}
