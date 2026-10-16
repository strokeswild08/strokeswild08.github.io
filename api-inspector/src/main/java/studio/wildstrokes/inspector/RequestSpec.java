package studio.wildstrokes.inspector;
import java.net.URI;
import java.util.*;
import java.util.regex.Pattern;
public record RequestSpec(String method,String url,String headers,String body,int timeoutSeconds) {
 public RequestSpec { method=Objects.requireNonNull(method).toUpperCase(Locale.ROOT); url=Objects.requireNonNull(url).trim(); headers=Objects.requireNonNullElse(headers,""); body=Objects.requireNonNullElse(body,""); }
 public URI uri() {
  URI uri;
  try { uri=URI.create(url); } catch(IllegalArgumentException e){throw new IllegalArgumentException("Enter a valid HTTP(S) URL.");}
  if(!Set.of("http","https").contains(Objects.toString(uri.getScheme(),"").toLowerCase(Locale.ROOT))||uri.getHost()==null)throw new IllegalArgumentException("URL must start with http:// or https:// and include a host.");
  if(uri.getUserInfo()!=null)throw new IllegalArgumentException("Put credentials in headers, not in the URL.");
  if(uri.getFragment()!=null)throw new IllegalArgumentException("Remove the URL fragment (#...). It is not sent to the server.");
  return uri;
 }
 public void validate() {
  uri(); if(!Set.of("GET","POST","PUT","PATCH","DELETE","HEAD","OPTIONS").contains(method))throw new IllegalArgumentException("Unsupported HTTP method.");
  if(timeoutSeconds<1||timeoutSeconds>120)throw new IllegalArgumentException("Timeout must be 1–120 seconds.");
  if(body.getBytes(java.nio.charset.StandardCharsets.UTF_8).length>1_048_576)throw new IllegalArgumentException("Request body exceeds the 1 MiB limit.");
  if(headers.length()>16_384||url.length()>8192)throw new IllegalArgumentException("URL or headers are too large.");
  parsedHeaders();
 }
 public List<Map.Entry<String,String>> parsedHeaders(){
  var out=new ArrayList<Map.Entry<String,String>>();var restricted=Set.of("host","content-length","connection","expect","upgrade");
  for(String line:headers.split("\\R")){
   if(line.isBlank())continue;int split=line.indexOf(':');if(split<=0)throw new IllegalArgumentException("Use one header per line: Name: value");
   String name=line.substring(0,split).trim(),value=line.substring(split+1).trim();
   if(!Pattern.matches("[!#$%&'*+.^_`|~0-9A-Za-z-]+",name)||value.chars().anyMatch(c->c<32&&c!=9||c==127))throw new IllegalArgumentException("Invalid header name or value.");
   if(restricted.contains(name.toLowerCase(Locale.ROOT)))throw new IllegalArgumentException(name+" is managed by Java's HTTP client.");
   out.add(Map.entry(name,value));
  }return List.copyOf(out);
 }
}
