package studio.wildstrokes.inspector;
import java.nio.file.*;
import java.nio.*;
import java.nio.charset.StandardCharsets;
import java.util.*;
import java.util.concurrent.*;
import java.net.http.HttpTimeoutException;
public final class CoreChecks {
 private static int count;
 private static void check(boolean value,String name){count++;if(!value)throw new AssertionError(name);}
 private static void rejects(Runnable action,String name){boolean rejected=false;try{action.run();}catch(IllegalArgumentException e){rejected=true;}check(rejected,name);}
 private static RequestSpec request(String method,String url,String headers,String body,int timeout){return new RequestSpec(method,url,headers,body,timeout);}
 public static void main(String[] args)throws Exception {
  rejects(()->request("GET","file:///tmp/x","","",10).validate(),"reject file scheme");rejects(()->request("GET","https://a:b@example.com","","",10).validate(),"reject URL credentials");rejects(()->request("GET","https://example.com/#secret","","",10).validate(),"reject fragment");
  rejects(()->request("TRACE","https://example.com","","",10).validate(),"reject unsupported method");rejects(()->request("GET","https://example.com","Host: other","",10).validate(),"managed header rejected");rejects(()->request("GET","https://example.com","Broken header","",10).validate(),"invalid header syntax");rejects(()->request("GET","https://example.com","","",0).validate(),"timeout validation");rejects(()->request("POST","https://example.com","","x".repeat(1_048_577),10).validate(),"request size cap");
  var duplicate=request("GET","https://example.com","X-List: a\nX-List: b","",10);check(duplicate.parsedHeaders().size()==2,"duplicate headers retained");
  check(JsonTools.format("{\"quote\":\"x\\\"y\",\"nested\":[1,true,null]}").contains("\n"),"pretty JSON preserves values");
  rejects(()->JsonTools.format("{broken}"),"malformed JSON rejected");rejects(()->JsonTools.format("{\"a\":1} garbage"),"trailing JSON garbage rejected");rejects(()->JsonTools.format("// comment\n{}"),"comments rejected");check(JsonTools.format("null").equals("null"),"JSON null");check(JsonTools.format("\"hello\"").equals("\"hello\""),"JSON scalar");
  Path file=Files.createTempDirectory("inspector-tests-").resolve("workspace.json");var store=new WorkspaceStore(file);var spec=request("POST","https://example.com/echo?api_key=secret&sort=asc","Authorization: Bearer hidden\nCookie: private\nX-Api-Key: secret\nX-Trace: visible","{\"message\":\"héllo\"}",10);
  var saved=store.save(null,"Echo example",spec);String disk=Files.readString(file);check(!disk.contains("Bearer hidden")&&!disk.contains("private")&&!disk.contains("api_key=secret"),"credential redaction");check(saved.headers().contains("X-Trace: visible"),"non-secret header preserved");check(saved.url().contains("sort=asc")&&saved.url().contains("redacted"),"query redaction preserves other parameters");check(saved.body().contains("héllo"),"explicit saved body retained");
  var loaded=new WorkspaceStore(file);check(loaded.collections().size()==1&&loaded.collections().get(0).name().equals("Echo example"),"collections survive restart");store.save(saved.id(),"Updated",spec);check(store.collections().size()==1&&store.collections().get(0).name().equals("Updated"),"save updates existing ID");
  for(int i=0;i<103;i++)store.record(spec,200,i);check(store.history().size()==100&&store.history().get(0).millis()==102,"bounded newest-first history");check(!JsonTools.JSON.toJson(store.history()).contains("message"),"history omits body");
  store.delete(saved.id());check(store.collections().isEmpty(),"delete collection");store.clearHistory();check(new WorkspaceStore(file).history().isEmpty(),"clear history persists");
  Path bad=Files.createTempFile("inspector-corrupt-",".json");Files.writeString(bad,"{not valid}");boolean damaged=false;try{new WorkspaceStore(bad);}catch(java.io.IOException e){damaged=true;}check(damaged&&Files.readString(bad).equals("{not valid}"),"corrupt workspace preserved");
  try(var demo=new DemoServer();var engine=new HttpEngine()){
   var health=engine.send(request("GET",demo.baseUrl()+"/health","Accept: application/json","",5)).result().get(7,TimeUnit.SECONDS);check(health.status()==200&&health.text().contains("healthy"),"real local HTTP GET");check(health.bytes().length>0&&health.millis()>=0&&health.headerText().contains("x-demo"),"response bytes timing headers");
   var echo=engine.send(request("POST",demo.baseUrl()+"/echo?x=1","Content-Type: application/json\nX-Probe: works","{\"hi\":\"世界\"}",5)).result().get(7,TimeUnit.SECONDS);var json=JsonTools.JSON.fromJson(echo.text(),com.google.gson.JsonObject.class);check(json.get("method").getAsString().equals("POST")&&json.get("body").getAsString().contains("世界"),"POST UTF-8 body preserved");check(json.get("headers").toString().toLowerCase(Locale.ROOT).contains("x-probe"),"request headers sent");
   for(String method:List.of("PUT","PATCH","DELETE","OPTIONS")){var r=engine.send(request(method,demo.baseUrl()+"/echo","","payload",5)).result().get(7,TimeUnit.SECONDS);check(r.text().contains(method),"HTTP "+method);}
   var missing=engine.send(request("GET",demo.baseUrl()+"/missing","","",5)).result().get(7,TimeUnit.SECONDS);check(missing.status()==404&&missing.text().contains("not found"),"HTTP errors are valid responses");
   var redirect=engine.send(request("GET",demo.baseUrl()+"/redirect","","",5)).result().get(7,TimeUnit.SECONDS);check(redirect.status()==302&&redirect.headers().containsKey("location"),"redirect not followed");
   var head=engine.send(request("HEAD",demo.baseUrl()+"/health","","",5)).result().get(7,TimeUnit.SECONDS);check(head.status()==200&&head.bytes().length==0,"HEAD has no response body");
   var binary=engine.send(request("GET",demo.baseUrl()+"/binary","","",5)).result().get(7,TimeUnit.SECONDS);check(!binary.isText()&&binary.bytes().length==4&&binary.bytes()[3]==(byte)255,"binary response retained");
   boolean capped=false;try{engine.send(request("GET",demo.baseUrl()+"/large","","",5)).result().get(7,TimeUnit.SECONDS);}catch(ExecutionException e){capped=HttpEngine.unwrap(e).getMessage().contains("2 MiB");}check(capped,"oversized response cancelled");
   boolean timed=false;long start=System.nanoTime();try{engine.send(request("GET",demo.baseUrl()+"/slow","","",1)).result().get(4,TimeUnit.SECONDS);}catch(ExecutionException e){timed=HttpEngine.unwrap(e) instanceof HttpTimeoutException;}check(timed&&TimeUnit.NANOSECONDS.toMillis(System.nanoTime()-start)<2500,"whole exchange deadline");
   var slow=engine.send(request("GET",demo.baseUrl()+"/slow","","",5));slow.cancel().run();boolean cancelled=false;try{slow.result().join();}catch(CancellationException e){cancelled=true;}check(cancelled,"explicit cancellation");
   var afterCancel=engine.send(request("GET",demo.baseUrl()+"/users","","",5)).result().get(7,TimeUnit.SECONDS);check(afterCancel.status()==200,"client reusable after cancel");
  }
  var latin=new HttpEngine.Response(200,Map.of("content-type",List.of("text/plain; charset=ISO-8859-1")),new byte[]{(byte)0xe9},0,"HTTP_1_1");check(latin.text().equals("é"),"response charset respected");
  System.out.println("PASS: "+count+" checks (real local HTTP, persistence and validation)");
 }
}
