package studio.wildstrokes.inspector;
import java.io.*;
import java.net.*;
import java.nio.charset.StandardCharsets;
import java.nio.file.*;
import java.time.Instant;
import java.util.*;
public final class WorkspaceStore {
 public record Saved(String id,String name,String method,String url,String headers,String body,int timeoutSeconds){
  public RequestSpec request(){return new RequestSpec(method,url,headers,body,timeoutSeconds);}
  public String toString(){return method+"   "+name;}
 }
 public record Visit(String method,String url,int status,long millis,String at){public String toString(){return method+"  "+url;}}
 static final class Data {int version=1;List<Saved> collections=new ArrayList<>();List<Visit> history=new ArrayList<>();}
 private final Path file;private Data data;
 public WorkspaceStore(Path file)throws IOException {
  this.file=file;data=new Data();
  if(Files.exists(file)){
   if(Files.size(file)>8_388_608)throw new IOException("Workspace exceeds the 8 MiB limit; existing file was not changed.");
   try{data=JsonTools.JSON.fromJson(Files.readString(file),Data.class);if(data==null||data.version!=1||data.collections==null||data.history==null||data.collections.size()>200||data.history.size()>100)throw new IllegalArgumentException("Unsupported workspace data");
    for(var entry:data.collections){if(entry==null||entry.id()==null||entry.name()==null)throw new IllegalArgumentException("Invalid saved entry");entry.request().validate();}
    for(var entry:data.history)if(entry==null||entry.method()==null||entry.url()==null)throw new IllegalArgumentException("Invalid history entry");
   }catch(RuntimeException e){throw new IOException("Cannot read workspace; existing file was not changed.",e);}
  }
 }
 public List<Saved> collections(){return List.copyOf(data.collections);}
 public List<Visit> history(){return List.copyOf(data.history);}
 public static String safeUrl(String url){
  URI u=URI.create(url);if(u.getRawQuery()==null)return url;
  String query=Arrays.stream(u.getRawQuery().split("&",-1)).map(pair->{int x=pair.indexOf('=');String key=x<0?pair:pair.substring(0,x);String decoded;
   try{decoded=URLDecoder.decode(key,StandardCharsets.UTF_8);}catch(IllegalArgumentException e){decoded=key;}
   return sensitive(decoded)?key+"=%3Credacted%3E":pair;
  }).collect(java.util.stream.Collectors.joining("&"));
  return url.substring(0,url.indexOf('?')+1)+query;
 }
 private static boolean sensitive(String name){String k=name.toLowerCase(Locale.ROOT).replace("-","").replace("_","");return k.contains("token")||k.contains("secret")||k.contains("password")||k.equals("authorization")||k.equals("proxyauthorization")||k.equals("cookie")||k.endsWith("key");}
 public static String safeHeaders(RequestSpec spec){var out=new StringBuilder();for(var h:spec.parsedHeaders())if(!sensitive(h.getKey()))out.append(h.getKey()).append(": ").append(h.getValue()).append('\n');return out.toString();}
 public Saved save(String id,String name,RequestSpec request)throws IOException {
  request.validate();if(name==null||name.isBlank()||name.length()>100)throw new IllegalArgumentException("Name must be 1–100 characters.");
  if(request.body().length()>131072)throw new IllegalArgumentException("Saved request body exceeds 128 KiB of text.");
  var saved=new Saved(id==null?UUID.randomUUID().toString():id,name.trim(),request.method(),safeUrl(request.url()),safeHeaders(request),request.body(),request.timeoutSeconds());
  var previous=new ArrayList<>(data.collections);data.collections.removeIf(s->s.id().equals(saved.id()));
  if(data.collections.size()>=200){data.collections=previous;throw new IOException("Collection limit reached (200 requests).");}
  data.collections.add(saved);try{write();}catch(IOException e){data.collections=previous;throw e;}return saved;
 }
 public void delete(String id)throws IOException {var old=new ArrayList<>(data.collections);data.collections.removeIf(s->s.id().equals(id));try{write();}catch(IOException e){data.collections=old;throw e;}}
 public void record(RequestSpec request,int status,long millis)throws IOException {
  var old=new ArrayList<>(data.history);data.history.add(0,new Visit(request.method(),safeUrl(request.url()),status,millis,Instant.now().toString()));if(data.history.size()>100)data.history=new ArrayList<>(data.history.subList(0,100));try{write();}catch(IOException e){data.history=old;throw e;}
 }
 public void clearHistory()throws IOException {var old=data.history;data.history=new ArrayList<>();try{write();}catch(IOException e){data.history=old;throw e;}}
 private void write()throws IOException {
  Path dir=file.toAbsolutePath().getParent();Files.createDirectories(dir);Path temp=Files.createTempFile(dir,"workspace-",".tmp");
  try{Files.writeString(temp,JsonTools.JSON.toJson(data),StandardCharsets.UTF_8);try{Files.move(temp,file,StandardCopyOption.ATOMIC_MOVE,StandardCopyOption.REPLACE_EXISTING);}catch(AtomicMoveNotSupportedException e){Files.move(temp,file,StandardCopyOption.REPLACE_EXISTING);}}finally{Files.deleteIfExists(temp);}
 }
}
