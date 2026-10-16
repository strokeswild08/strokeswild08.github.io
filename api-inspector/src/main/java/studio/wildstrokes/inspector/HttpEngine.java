package studio.wildstrokes.inspector;
import java.io.*;
import java.net.http.*;
import java.nio.*;
import java.nio.charset.*;
import java.time.Duration;
import java.util.*;
import java.util.concurrent.*;
import java.util.concurrent.Flow;
import java.util.regex.Pattern;
public final class HttpEngine implements AutoCloseable {
 public static final int MAX_RESPONSE=2*1024*1024;
 public record Response(int status,Map<String,List<String>> headers,byte[] bytes,long millis,String protocol){
  public String headerText(){var out=new StringBuilder();headers.forEach((k,v)->v.forEach(x->out.append(k).append(": ").append(x).append('\n')));return out.toString();}
  public boolean isText(){String type=headers.getOrDefault("content-type",List.of("")).get(0).toLowerCase(Locale.ROOT);return type.isBlank()||type.startsWith("text/")||type.contains("json")||type.contains("xml")||type.contains("javascript")||type.contains("x-www-form-urlencoded");}
  public String text(){
   if(!isText())return "[Binary response: "+bytes.length+" bytes. Use Save response to download the original bytes.]";
   Charset charset=StandardCharsets.UTF_8;String contentType=headers.getOrDefault("content-type",List.of("")).get(0);
   var matcher=Pattern.compile("charset\\s*=\\s*[\"']?([^;\\s\"']+)",Pattern.CASE_INSENSITIVE).matcher(contentType);
   if(matcher.find())try{charset=Charset.forName(matcher.group(1));}catch(IllegalArgumentException ignored){}
   return new String(bytes,charset);
  }
 }
 public record Exchange(CompletableFuture<Response> result,Runnable cancel){}
 private final ScheduledExecutorService deadlines=Executors.newSingleThreadScheduledExecutor(r->{Thread t=new Thread(r,"inspector-deadlines");t.setDaemon(true);return t;});
 private final HttpClient client=HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(10)).followRedirects(HttpClient.Redirect.NEVER).build();
 public Exchange send(RequestSpec spec){
  spec.validate();var builder=HttpRequest.newBuilder(spec.uri()).timeout(Duration.ofSeconds(spec.timeoutSeconds()));
  for(var entry:spec.parsedHeaders())builder.header(entry.getKey(),entry.getValue());
  builder.method(spec.method(),spec.body().isEmpty()?HttpRequest.BodyPublishers.noBody():HttpRequest.BodyPublishers.ofString(spec.body(),StandardCharsets.UTF_8));
  long start=System.nanoTime();var raw=client.sendAsync(builder.build(),info->new LimitedBody(MAX_RESPONSE));
  var result=new CompletableFuture<Response>();
  var timeout=deadlines.schedule(()->{if(result.completeExceptionally(new HttpTimeoutException("Request timed out after "+spec.timeoutSeconds()+" seconds.")))raw.cancel(true);},spec.timeoutSeconds(),TimeUnit.SECONDS);
  raw.whenComplete((response,error)->{
   timeout.cancel(false);
   if(error!=null){result.completeExceptionally(unwrap(error));return;}
   result.complete(new Response(response.statusCode(),response.headers().map(),response.body(),TimeUnit.NANOSECONDS.toMillis(System.nanoTime()-start),response.version().toString()));
  });
  Runnable cancel=()->{if(result.completeExceptionally(new CancellationException("Request cancelled.")))raw.cancel(true);};
  return new Exchange(result,cancel);
 }
 public static Throwable unwrap(Throwable error){while((error instanceof CompletionException||error instanceof ExecutionException)&&error.getCause()!=null)error=error.getCause();return error;}
 @Override public void close(){deadlines.shutdownNow();}
 static final class LimitedBody implements HttpResponse.BodySubscriber<byte[]> {
  private final int limit;private final ByteArrayOutputStream bytes=new ByteArrayOutputStream();private final CompletableFuture<byte[]> future=new CompletableFuture<>();private Flow.Subscription subscription;
  LimitedBody(int limit){this.limit=limit;}
  public CompletionStage<byte[]> getBody(){return future;}
  public void onSubscribe(Flow.Subscription s){subscription=s;s.request(1);}
  public void onNext(List<ByteBuffer> buffers){
   if(future.isDone())return;
   for(var buffer:buffers){if(buffer.remaining()>limit-bytes.size()){subscription.cancel();future.completeExceptionally(new IOException("Response exceeds the 2 MiB display limit."));return;}byte[] chunk=new byte[buffer.remaining()];buffer.get(chunk);bytes.writeBytes(chunk);}
   subscription.request(1);
  }
  public void onError(Throwable error){future.completeExceptionally(error);}
  public void onComplete(){future.complete(bytes.toByteArray());}
 }
}
