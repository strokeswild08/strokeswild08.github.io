package studio.wildstrokes.inspector;
import com.sun.net.httpserver.*;
import java.io.*;
import java.net.*;
import java.nio.charset.StandardCharsets;
import java.util.concurrent.*;
public final class DemoServer implements AutoCloseable {
 private final HttpServer server;private final ExecutorService pool;
 public DemoServer()throws IOException{
  server=HttpServer.create(new InetSocketAddress("127.0.0.1",0),0);
  pool=Executors.newCachedThreadPool(r->{Thread t=new Thread(r,"inspector-demo");t.setDaemon(true);return t;});server.setExecutor(pool);
  server.createContext("/",e->{try{
   switch(e.getRequestURI().getPath()){
    case "/health"->respond(e,200,"application/json","{\"service\":\"API Inspector local demo\",\"status\":\"healthy\",\"version\":\"1.0.0\"}");
    case "/users"->respond(e,200,"application/json","{\"users\":[{\"id\":1,\"name\":\"Ada\",\"role\":\"developer\"},{\"id\":2,\"name\":\"Owais\",\"role\":\"designer\"}],\"total\":2}");
    case "/echo"->{byte[] body=e.getRequestBody().readNBytes(1_048_577);if(body.length>1_048_576){respond(e,413,"application/json","{\"error\":\"body too large\"}");break;}var json=new com.google.gson.JsonObject();json.addProperty("method",e.getRequestMethod());json.addProperty("path",e.getRequestURI().toString());json.addProperty("body",new String(body,StandardCharsets.UTF_8));json.add("headers",JsonTools.JSON.toJsonTree(e.getRequestHeaders()));respond(e,200,"application/json",JsonTools.JSON.toJson(json));}
    case "/slow"->{try{Thread.sleep(3000);}catch(InterruptedException ex){Thread.currentThread().interrupt();}respond(e,200,"application/json","{\"status\":\"delayed\"}");}
    case "/large"->respond(e,200,"text/plain","x".repeat(HttpEngine.MAX_RESPONSE+512));
    case "/redirect"->{e.getResponseHeaders().set("Location","/health");respond(e,302,"text/plain","Redirects are not followed automatically.");}
    case "/binary"->{byte[] bytes={0,1,2,(byte)255};e.getResponseHeaders().set("Content-Type","application/octet-stream");e.sendResponseHeaders(200,bytes.length);e.getResponseBody().write(bytes);e.close();}
    default->respond(e,404,"application/json","{\"error\":\"not found\"}");
   }
  }catch(IOException ignored){e.close();}});server.start();
 }
 public String baseUrl(){return "http://127.0.0.1:"+server.getAddress().getPort();}
 private static void respond(HttpExchange e,int status,String type,String text)throws IOException{
  byte[] bytes=text.getBytes(StandardCharsets.UTF_8);e.getResponseHeaders().set("Content-Type",type+"; charset=utf-8");e.getResponseHeaders().add("X-Demo","local-only");
  if(e.getRequestMethod().equals("HEAD")){e.sendResponseHeaders(status,-1);}else{e.sendResponseHeaders(status,bytes.length);e.getResponseBody().write(bytes);}e.close();
 }
 public void close(){server.stop(0);pool.shutdownNow();}
}
