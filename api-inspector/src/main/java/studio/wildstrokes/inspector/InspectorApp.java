package studio.wildstrokes.inspector;
import javafx.application.*;
import javafx.collections.*;
import javafx.geometry.*;
import javafx.scene.*;
import javafx.scene.control.*;
import javafx.scene.input.*;
import javafx.scene.layout.*;
import javafx.stage.*;
import java.nio.file.*;
import java.io.*;
import java.util.*;
import java.util.concurrent.*;
public final class InspectorApp extends Application {
 private final HttpEngine engine=new HttpEngine();private HttpEngine.Exchange active;private HttpEngine.Response response;private DemoServer demo;
 private WorkspaceStore store;private Stage stage;private long sequence;private String savedId;
 private final ComboBox<String> method=new ComboBox<>(FXCollections.observableArrayList("GET","POST","PUT","PATCH","DELETE","HEAD","OPTIONS"));
 private final TextField url=new TextField("https://example.com"), search=new TextField();
 private final TextArea requestBody=new TextArea(),requestHeaders=new TextArea("Accept: application/json"),responseBody=new TextArea(),responseHeaders=new TextArea();
 private final Spinner<Integer> timeout=new Spinner<>(1,120,20);
 private final ListView<WorkspaceStore.Saved> collections=new ListView<>();private final ListView<WorkspaceStore.Visit> history=new ListView<>();
 private final Label status=label("READY","status"),timing=label("— ms","metric"),size=label("— bytes","metric"),message=label("Ready. Enter a URL or try the local demo.","footer-message"),requestTitle=label("Untitled request","request-title"),count=label("0 saved","subtle");
 private final Button send=new Button("Send request  ↗"),cancel=new Button("Cancel");private final CheckBox pretty=new CheckBox("Pretty JSON");
 private VBox requestPane;private boolean busy;private String storageNote="LOCAL WORKSPACE  /  SAVED ON THIS DEVICE";
 private static Label label(String text,String css){var l=new Label(text);l.getStyleClass().add(css);return l;}
 private static Button button(String text,String css){var b=new Button(text);b.getStyleClass().add(css);return b;}
 private void info(String text){message.setText(text);}
 private void fail(Throwable error){Throwable cause=HttpEngine.unwrap(error);info(cause.getClass().getSimpleName()+": "+Objects.toString(cause.getMessage(),"Request failed."));}
 @Override public void start(Stage stage)throws Exception {
  this.stage=stage;Path home=Path.of(System.getProperty("user.home"),".wildstrokes","api-inspector","workspace.json");
  String override=System.getProperty("inspector.workspace");if(override!=null)home=Path.of(override);
  try{store=new WorkspaceStore(home);}catch(IOException e){store=new WorkspaceStore(Files.createTempDirectory("api-inspector-session-").resolve("workspace.json"));storageNote="TEMPORARY WORKSPACE / ORIGINAL FILE LEFT UNCHANGED";info(e.getMessage()+" Using a temporary workspace for this session.");}
  method.setValue("GET");method.setPrefWidth(105);url.setPromptText("https://api.example.com/resource");url.getStyleClass().add("url-input");requestBody.setPromptText("Optional request body. For JSON, add Content-Type: application/json in Headers.");
  requestHeaders.setPromptText("One header per line: Name: value");for(var area:List.of(requestBody,requestHeaders,responseBody,responseHeaders)){area.getStyleClass().add("code-area");area.setWrapText(false);}
  responseBody.setEditable(false);responseHeaders.setEditable(false);responseBody.setText("// Your response will appear here.\n// No request is sent until you click Send request.\n\n// Try Local demo for /health, /users and /echo endpoints.");
  cancel.setDisable(true);send.getStyleClass().add("send-button");cancel.getStyleClass().add("quiet-button");send.setOnAction(e->send());cancel.setOnAction(e->{if(active!=null)active.cancel().run();});url.setOnAction(e->send());
  var shell=new BorderPane();shell.getStyleClass().add("shell");shell.setTop(topbar());shell.setLeft(sidebar());shell.setCenter(workspace());shell.setBottom(footer());
  var scene=new Scene(shell,1280,850);scene.getStylesheets().add(Objects.requireNonNull(getClass().getResource("/inspector.css")).toExternalForm());
  scene.getAccelerators().put(new KeyCodeCombination(KeyCode.ENTER,KeyCombination.SHORTCUT_DOWN),this::send);scene.getAccelerators().put(new KeyCodeCombination(KeyCode.S,KeyCombination.SHORTCUT_DOWN),this::saveRequest);
  stage.setTitle("API Inspector — Wild Strokes");stage.setMinWidth(1000);stage.setMinHeight(720);stage.setScene(scene);stage.show();refresh();
  if(Boolean.getBoolean("inspector.demoOnStart"))Platform.runLater(this::localDemo);
 }
 private Node topbar(){
  var logo=label("↗","logo");var brand=new VBox(2,label("WILD STROKES","brand"),label("DEVELOPER TOOLS / 01","eyebrow"));var title=new HBox(12,logo,brand);title.setAlignment(Pos.CENTER_LEFT);
  var middle=label("API INSPECTOR","app-heading");var demoButton=button("Local demo","outline-button");demoButton.setOnAction(e->localDemo());var top=new HBox(24,title,spacer(),middle,spacer(),demoButton);top.setAlignment(Pos.CENTER_LEFT);top.getStyleClass().add("topbar");return top;
 }
 private Region spacer(){var r=new Region();HBox.setHgrow(r,Priority.ALWAYS);return r;}
 private Node sidebar(){
  var title=new HBox(label("WORKSPACE","eyebrow"),spacer(),count);title.setAlignment(Pos.CENTER_LEFT);search.setPromptText("Filter saved requests…");search.getStyleClass().add("search");search.textProperty().addListener((o,a,b)->refreshLists());
  var fresh=button("＋ New request","new-button");fresh.setMaxWidth(Double.MAX_VALUE);fresh.setOnAction(e->{if(!busy){savedId=null;method.setValue("GET");url.setText("https://example.com");requestHeaders.setText("Accept: application/json");requestBody.clear();requestTitle.setText("Untitled request");collections.getSelectionModel().clearSelection();}});
  collections.setPlaceholder(label("No saved requests yet.\nBuild one, then Save request.","empty"));collections.setCellFactory(v->new ListCell<>(){protected void updateItem(WorkspaceStore.Saved item,boolean empty){super.updateItem(item,empty);setText(empty||item==null?null:item.method()+"  "+item.name());}});
  collections.setOnMouseClicked(e->{var item=collections.getSelectionModel().getSelectedItem();if(item!=null&&!busy)load(item);});collections.setOnKeyPressed(e->{if(e.getCode()==KeyCode.ENTER){var item=collections.getSelectionModel().getSelectedItem();if(item!=null&&!busy)load(item);}});
  var remove=button("Remove selected","link-button");remove.setOnAction(e->{var item=collections.getSelectionModel().getSelectedItem();if(item==null)return;try{store.delete(item.id());if(item.id().equals(savedId)){savedId=null;requestTitle.setText("Untitled request");}refresh();info("Saved request removed.");}catch(IOException ex){fail(ex);}});
  var collectionBox=new VBox(10,collections,remove);VBox.setVgrow(collections,Priority.ALWAYS);var savedTab=new Tab("Collections",collectionBox);savedTab.setClosable(false);
  history.setPlaceholder(label("Requests you send appear here.\nHeaders and body are not stored.","empty"));history.setCellFactory(v->new ListCell<>(){protected void updateItem(WorkspaceStore.Visit item,boolean empty){super.updateItem(item,empty);if(empty||item==null){setText(null);setTooltip(null);}else{setText(item.method()+"  "+item.status()+"\n"+item.url());setTooltip(new Tooltip(item.at()+" · "+item.millis()+" ms"));}}});
  history.setOnMouseClicked(e->{var item=history.getSelectionModel().getSelectedItem();if(item==null||busy)return;savedId=null;method.setValue(item.method());url.setText(item.url());requestHeaders.setText("Accept: application/json");requestBody.clear();requestTitle.setText("From history");info("Loaded method and URL. Re-enter headers/body if needed.");});
  var clear=button("Clear history","link-button");clear.setOnAction(e->{try{store.clearHistory();refresh();}catch(IOException ex){fail(ex);}});var historyBox=new VBox(10,history,clear);VBox.setVgrow(history,Priority.ALWAYS);var historyTab=new Tab("History",historyBox);historyTab.setClosable(false);
  var tabs=new TabPane(savedTab,historyTab);VBox.setVgrow(tabs,Priority.ALWAYS);
  var note=label("History keeps method + URL.\nCollections include body text.\nCredential headers are not saved.","sidebar-note");note.setWrapText(true);var box=new VBox(17,title,fresh,search,tabs,note);box.setPrefWidth(246);box.setMinWidth(220);box.getStyleClass().add("sidebar");return box;
 }
 private Node workspace(){
  var save=button("Save request","outline-button");save.setOnAction(e->saveRequest());var requestHeading=new HBox(12,requestTitle,spacer(),save);requestHeading.setAlignment(Pos.CENTER_LEFT);
  var requestBar=new HBox(10,method,url,send,cancel);requestBar.setAlignment(Pos.CENTER_LEFT);HBox.setHgrow(url,Priority.ALWAYS);
  var timeoutBox=new HBox(8,label("TIMEOUT","eyebrow"),timeout,label("seconds  ·  Redirects are shown, not followed","subtle"));timeoutBox.setAlignment(Pos.CENTER_LEFT);timeout.setEditable(false);timeout.setPrefWidth(85);
  var format=button("Format JSON","link-button");format.setOnAction(e->{try{requestBody.setText(JsonTools.format(requestBody.getText()));info("Request JSON formatted.");}catch(IllegalArgumentException ex){fail(ex);}});
  var bodyBox=new VBox(8,format,requestBody);VBox.setVgrow(requestBody,Priority.ALWAYS);var bodyTab=new Tab("Body",bodyBox);bodyTab.setClosable(false);var headerTab=new Tab("Headers",requestHeaders);headerTab.setClosable(false);var requestTabs=new TabPane(bodyTab,headerTab);VBox.setVgrow(requestTabs,Priority.ALWAYS);
  requestPane=new VBox(12,timeoutBox,requestTabs);requestPane.setMinHeight(130);requestPane.setPrefHeight(250);
  pretty.setSelected(true);pretty.setOnAction(e->displayResponse());var copy=button("Copy body","link-button");copy.setOnAction(e->{var content=new ClipboardContent();content.putString(responseBody.getText());Clipboard.getSystemClipboard().setContent(content);info("Displayed response body copied.");});var saveResponse=button("Save response…","link-button");saveResponse.setOnAction(e->saveResponse());
  var responseHeading=new HBox(13,label("RESPONSE","eyebrow"),status,timing,size,spacer(),pretty,copy,saveResponse);responseHeading.setAlignment(Pos.CENTER_LEFT);
  var resultTab=new Tab("Body",responseBody);resultTab.setClosable(false);var resultHeaders=new Tab("Headers",responseHeaders);resultHeaders.setClosable(false);var resultTabs=new TabPane(resultTab,resultHeaders);VBox.setVgrow(resultTabs,Priority.ALWAYS);
  var responseBox=new VBox(12,responseHeading,resultTabs);responseBox.setMinHeight(180);responseBox.getStyleClass().add("response-panel");
  var split=new SplitPane(requestPane,responseBox);split.setOrientation(Orientation.VERTICAL);split.setDividerPositions(.43);VBox.setVgrow(split,Priority.ALWAYS);
  var content=new VBox(18,requestHeading,requestBar,split);content.getStyleClass().add("workspace");return content;
 }
 private Node footer(){var bar=new HBox(message,spacer(),label(storageNote,"storage-note"));bar.setAlignment(Pos.CENTER_LEFT);bar.getStyleClass().add("footer");message.setMaxWidth(800);message.setWrapText(true);return bar;}
 private RequestSpec current(){return new RequestSpec(method.getValue(),url.getText(),requestHeaders.getText(),requestBody.getText(),timeout.getValue());}
 private void setBusy(boolean value){busy=value;send.setDisable(value);cancel.setDisable(!value);method.setDisable(value);url.setDisable(value);requestPane.setDisable(value);}
 private void send(){
  if(busy)return;final RequestSpec snapshot;
  try{snapshot=current();snapshot.validate();}catch(RuntimeException e){fail(e);return;}
  final long token=++sequence;response=null;responseBody.clear();responseHeaders.clear();status.setText("SENDING");status.getStyleClass().removeAll("success","failure");timing.setText("— ms");size.setText("— bytes");info("Request in flight. Cancel is available.");setBusy(true);
  try{active=engine.send(snapshot);}catch(RuntimeException e){setBusy(false);status.setText("ERROR");fail(e);return;}
  active.result().whenComplete((result,error)->Platform.runLater(()->{
   if(token!=sequence)return;setBusy(false);active=null;
   if(error!=null){Throwable cause=HttpEngine.unwrap(error);status.setText(cause instanceof CancellationException?"CANCELLED":"ERROR");status.getStyleClass().add("failure");fail(cause);return;}
   response=result;status.setText(Integer.toString(result.status()));status.getStyleClass().add(result.status()<400?"success":"failure");timing.setText(result.millis()+" ms");size.setText(String.format(Locale.ROOT,"%,d bytes",result.bytes().length));responseHeaders.setText(result.headerText());displayResponse();info("Response received · "+result.protocol()+" · "+snapshot.method());
   try{store.record(snapshot,result.status(),result.millis());refresh();}catch(IOException e){info("Response received; could not save history: "+e.getMessage());}
   captureIfRequested();
  }));
 }
 private void displayResponse(){if(response==null)return;String text=response.text();if(pretty.isSelected()&&response.isText())try{text=JsonTools.format(text);}catch(IllegalArgumentException ignored){}responseBody.setText(text);responseBody.positionCaret(0);}
 private void saveRequest(){
  final RequestSpec request;try{request=current();request.validate();}catch(RuntimeException ex){fail(ex);return;}
  var dialog=new TextInputDialog(savedId==null?"New request":requestTitle.getText());dialog.initOwner(stage);dialog.setTitle("Save request");dialog.setHeaderText("Name this request");dialog.setContentText("Name:");
  dialog.showAndWait().ifPresent(name->{try{var saved=store.save(savedId,name,request);savedId=saved.id();requestTitle.setText(saved.name());refresh();info("Request saved locally. Credential headers omitted; body text included.");}catch(IOException|IllegalArgumentException ex){fail(ex);}});
 }
 private void load(WorkspaceStore.Saved saved){savedId=saved.id();method.setValue(saved.method());url.setText(saved.url());requestHeaders.setText(saved.headers());requestBody.setText(saved.body());timeout.getValueFactory().setValue(saved.timeoutSeconds());requestTitle.setText(saved.name());info("Loaded "+saved.name()+". Add credential headers before sending if required.");}
 private void refresh(){count.setText(store.collections().size()+" saved");refreshLists();}
 private void refreshLists(){if(store==null)return;String query=search.getText().toLowerCase(Locale.ROOT);collections.setItems(FXCollections.observableArrayList(store.collections().stream().filter(x->(x.name()+" "+x.url()+" "+x.method()).toLowerCase(Locale.ROOT).contains(query)).toList()));history.setItems(FXCollections.observableArrayList(store.history().stream().filter(x->(x.url()+" "+x.method()).toLowerCase(Locale.ROOT).contains(query)).toList()));}
 private void saveResponse(){if(response==null){info("Send a request first.");return;}var chooser=new FileChooser();chooser.setTitle("Save original response bytes");chooser.setInitialFileName(response.isText()?"response.txt":"response.bin");File file=chooser.showSaveDialog(stage);if(file!=null)try{Files.write(file.toPath(),response.bytes());info("Original response bytes saved.");}catch(IOException e){fail(e);}}
 private void localDemo(){if(busy)return;try{if(demo==null)demo=new DemoServer();savedId=null;method.setValue("GET");url.setText(demo.baseUrl()+"/users");requestHeaders.setText("Accept: application/json");requestBody.clear();requestTitle.setText("Local demo / users");send();}catch(IOException ex){fail(ex);}}
 private void captureIfRequested(){String file=System.getProperty("inspector.capture");if(file==null)return;Platform.runLater(()->{try{var image=stage.getScene().snapshot(null);javax.imageio.ImageIO.write(javafx.embed.swing.SwingFXUtils.fromFXImage(image,null),"png",Path.of(file).toFile());}catch(IOException e){e.printStackTrace();}finally{Platform.exit();}});}
 @Override public void stop(){sequence++;if(active!=null)active.cancel().run();engine.close();if(demo!=null)demo.close();}
}
