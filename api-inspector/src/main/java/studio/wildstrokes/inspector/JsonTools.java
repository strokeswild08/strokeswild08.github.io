package studio.wildstrokes.inspector;
import com.google.gson.*;
public final class JsonTools {
 private JsonTools(){}
 public static final Gson JSON=new GsonBuilder().setStrictness(Strictness.STRICT).serializeNulls().disableHtmlEscaping().setPrettyPrinting().create();
 public static String format(String value){
  if(value==null||value.isBlank())throw new IllegalArgumentException("Enter a JSON value to format.");
  try{return JSON.toJson(JSON.fromJson(value,JsonElement.class));}
  catch(JsonParseException|StackOverflowError e){throw new IllegalArgumentException("Invalid JSON: "+(e.getMessage()==null?"nesting too deep":e.getMessage()));}
 }
}
