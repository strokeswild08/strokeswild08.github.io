package shelf;

import javax.swing.*;
import javax.swing.event.*;
import javax.swing.table.*;
import javax.imageio.*;
import javax.imageio.stream.ImageInputStream;
import javax.imageio.ImageReadParam;
import javax.sound.sampled.*;
import java.awt.*;
import java.awt.image.BufferedImage;
import java.io.*;
import java.nio.file.*;
import java.text.*;
import java.time.*;
import java.util.*;
import java.util.List;
import java.util.concurrent.*;
import java.util.function.Consumer;

public final class App extends JPanel {
    private static final long serialVersionUID=1L;
    private final AssetModel model=new AssetModel();
    private final JTable table=new JTable(model);
    private final TableRowSorter<AssetModel> sorter=new TableRowSorter<>(model);
    private final JTextField search=new JTextField(24), tagInput=new JTextField();
    private final JComboBox<String> category=new JComboBox<>(new String[]{"All types","Image","Audio","Model"});
    private final JCheckBox duplicateOnly=new JCheckBox("Duplicates only");
    private final JTextArea details=new JTextArea();
    private final JLabel rootLabel=new JLabel("Choose an asset folder to begin"), stats=new JLabel("LOCAL FILES / NO UPLOADS"), status=new JLabel("Ready"), selectionLabel=new JLabel("ASSET INSPECTOR");
    private final ImagePreview preview=new ImagePreview();
    private final JProgressBar progress=new JProgressBar();
    private final JButton choose=new JButton("Open folder"), refresh=new JButton("Rescan"), findDuplicates=new JButton("Find duplicates"), rename=new JButton("Rename selected"), undoButton=new JButton("Undo rename"), csv=new JButton("Export CSV"), json=new JButton("Export JSON"), saveTags=new JButton("Save tags"), play=new JButton("Play WAV"), stop=new JButton("Stop"), cancel=new JButton("Cancel task");
    private Catalog.Scan catalog;
    private TagStore tags;
    private Map<Path,String> duplicates=Map.of();
    private RenameService.Plan undoPlan;
    private SwingWorker<?,?> active;
    private boolean busy=false;
    private long previewVersion=0;
    private Clip clip;

    public App() {
        super(new BorderLayout(0,18));
        setBackground(new Color(239,241,235));
        setBorder(BorderFactory.createEmptyBorder(26,26,18,26));
        JPanel heading=new JPanel(new BorderLayout(20,12)); heading.setOpaque(false);
        JLabel title=new JLabel("ASSET SHELF"); title.setFont(new Font(Font.SANS_SERIF,Font.BOLD,30));
        title.setForeground(new Color(31,54,48));
        JPanel brand=new JPanel(new GridLayout(2,1,0,6)); brand.setOpaque(false); brand.add(title); brand.add(stats);
        heading.add(brand,BorderLayout.WEST);
        JPanel commands=new JPanel(new FlowLayout(FlowLayout.RIGHT,8,0)); commands.setOpaque(false); commands.add(choose); commands.add(refresh); commands.add(findDuplicates); heading.add(commands,BorderLayout.EAST);
        JPanel north=new JPanel(new BorderLayout(0,18)); north.setOpaque(false); north.add(heading,BorderLayout.NORTH);
        JPanel filters=new JPanel(new BorderLayout(12,8)); filters.setOpaque(false);
        search.setToolTipText("Search relative paths, file types or tags");
        JPanel inputs=new JPanel(new FlowLayout(FlowLayout.LEFT,10,0)); inputs.setOpaque(false); inputs.add(new JLabel("SEARCH")); inputs.add(search); inputs.add(category); inputs.add(duplicateOnly);
        filters.add(rootLabel,BorderLayout.NORTH); filters.add(inputs,BorderLayout.SOUTH); north.add(filters,BorderLayout.SOUTH); add(north,BorderLayout.NORTH);
        table.setRowSorter(sorter); table.setRowHeight(38); table.setShowGrid(false); table.setIntercellSpacing(new Dimension(0,0)); table.setSelectionBackground(new Color(216,232,223)); table.setSelectionForeground(new Color(27,54,45)); table.setBackground(Color.WHITE); table.setFillsViewportHeight(true);
        table.setAutoResizeMode(JTable.AUTO_RESIZE_LAST_COLUMN);
        DefaultTableCellRenderer renderer=new DefaultTableCellRenderer(); renderer.putClientProperty("html.disable",Boolean.TRUE); renderer.setBorder(BorderFactory.createEmptyBorder(0,10,0,10)); table.setDefaultRenderer(Object.class,renderer);
        table.getTableHeader().setFont(new Font(Font.SANS_SERIF,Font.BOLD,12)); table.getTableHeader().setPreferredSize(new Dimension(100,38));
        table.getColumnModel().getColumn(0).setPreferredWidth(300); table.getColumnModel().getColumn(1).setPreferredWidth(65); table.getColumnModel().getColumn(2).setPreferredWidth(70); table.getColumnModel().getColumn(3).setPreferredWidth(180); table.getColumnModel().getColumn(4).setPreferredWidth(75);
        JPanel inspector=new JPanel(new BorderLayout(0,12)); inspector.setBackground(new Color(232,237,230)); inspector.setBorder(BorderFactory.createEmptyBorder(18,18,18,18));
        selectionLabel.setFont(new Font(Font.SANS_SERIF,Font.BOLD,12)); inspector.add(selectionLabel,BorderLayout.NORTH);
        preview.setPreferredSize(new Dimension(300,180));
        JPanel body=new JPanel(new BorderLayout(0,12)); body.setOpaque(false); body.add(preview,BorderLayout.NORTH);
        details.setEditable(false); details.setLineWrap(true); details.setWrapStyleWord(true); details.setFont(new Font(Font.MONOSPACED,Font.PLAIN,12)); details.setOpaque(false); details.setText("Select an asset to inspect it.\n\nImage previews: PNG, JPEG, GIF, BMP.\nWAV playback uses Java Sound.\nOther formats show metadata."); body.add(new JScrollPane(details),BorderLayout.CENTER); inspector.add(body,BorderLayout.CENTER);
        JPanel edits=new JPanel(new GridLayout(4,1,0,8)); edits.setOpaque(false); edits.add(new JLabel("TAGS / comma separated")); edits.add(tagInput); edits.add(saveTags);
        JPanel audio=new JPanel(new FlowLayout(FlowLayout.LEFT,5,0)); audio.setOpaque(false); audio.add(play); audio.add(stop); edits.add(audio); inspector.add(edits,BorderLayout.SOUTH);
        JScrollPane tableScroll=new JScrollPane(table);tableScroll.setColumnHeaderView(table.getTableHeader());
        JSplitPane split=new JSplitPane(JSplitPane.HORIZONTAL_SPLIT,tableScroll,inspector); split.setResizeWeight(0.73); split.setDividerLocation(720); split.setBorder(null); add(split,BorderLayout.CENTER);
        JPanel bottom=new JPanel(new BorderLayout(10,10)); bottom.setOpaque(false);
        JPanel tools=new JPanel(new FlowLayout(FlowLayout.LEFT,8,0)); tools.setOpaque(false); for(JButton button:List.of(rename,undoButton,csv,json,cancel))tools.add(button); bottom.add(tools,BorderLayout.NORTH);
        progress.setVisible(false); progress.setPreferredSize(new Dimension(110,5)); bottom.add(progress,BorderLayout.EAST); bottom.add(status,BorderLayout.CENTER); add(bottom,BorderLayout.SOUTH);
        rootLabel.putClientProperty("html.disable",Boolean.TRUE); status.putClientProperty("html.disable",Boolean.TRUE);
        choose.addActionListener(event->chooseFolder()); refresh.addActionListener(event->{if(catalog!=null)scanFolder(catalog.root());});
        findDuplicates.addActionListener(event->{if(catalog!=null)runTask("Checking duplicate candidates…",()->Catalog.duplicates(catalog.assets(),this::report),result->{duplicates=result;model.fireTableDataChanged();filter();status.setText(result.size()+" files in duplicate groups. Nothing deleted.");});});
        rename.addActionListener(event->prepareRename()); undoButton.addActionListener(event->undoRename());
        csv.addActionListener(event->export(false)); json.addActionListener(event->export(true)); saveTags.addActionListener(event->saveTags()); play.addActionListener(event->playAudio()); stop.addActionListener(event->stopAudio()); cancel.addActionListener(event->{if(active!=null)active.cancel(true);});
        search.getDocument().addDocumentListener(new DocumentListener(){public void insertUpdate(DocumentEvent e){filter();}public void removeUpdate(DocumentEvent e){filter();}public void changedUpdate(DocumentEvent e){filter();}});
        category.addActionListener(event->filter()); duplicateOnly.addActionListener(event->filter());
        table.getSelectionModel().addListSelectionListener(event->{if(!event.getValueIsAdjusting())inspect();}); updateButtons();
    }
    public static void theme() {
        UIManager.put("Label.font",new Font(Font.SANS_SERIF,Font.PLAIN,13)); UIManager.put("Button.font",new Font(Font.SANS_SERIF,Font.BOLD,12)); UIManager.put("Table.font",new Font(Font.SANS_SERIF,Font.PLAIN,13)); UIManager.put("TextField.font",new Font(Font.SANS_SERIF,Font.PLAIN,13)); UIManager.put("Button.background",new Color(225,233,223)); UIManager.put("Button.foreground",new Color(31,54,48));
    }
    private void chooseFolder() {
        JFileChooser chooser=new JFileChooser(); chooser.setFileSelectionMode(JFileChooser.DIRECTORIES_ONLY);
        if(chooser.showOpenDialog(this)==JFileChooser.APPROVE_OPTION)scanFolder(chooser.getSelectedFile().toPath());
    }
    public void scanFolder(Path root) {
        runTask("Scanning assets…",()->Catalog.scan(root,this::report),result->{try{load(result);}catch(IOException error){showError(error);} });
    }
    public void load(Catalog.Scan scan) throws IOException {
        TagStore loaded=new TagStore(scan.root());
        stopAudio(); previewVersion++;
        if(catalog==null || !catalog.root().equals(scan.root()))undoPlan=null;
        catalog=scan; tags=loaded; duplicates=Map.of(); duplicateOnly.setSelected(false); model.assets=scan.assets(); model.fireTableDataChanged();
        rootLabel.setText(scan.root().toString()); rootLabel.setToolTipText(scan.root().toString());
        stats.setText(scan.assets().size()+" ASSETS  /  "+scan.warnings().size()+" SCAN WARNINGS  /  WILD STROKES");
        status.setText(scan.warnings().isEmpty()?"Scan complete. Select files to inspect or rename.":"Scan complete with warnings. Click Rescan after correcting inaccessible paths.");
        status.setToolTipText(String.join("\n",scan.warnings())); filter(); updateButtons();
        if(!scan.assets().isEmpty())table.setRowSelectionInterval(0,0);
    }
    private <T> void runTask(String label, Callable<T> action, Consumer<T> success) {
        if(busy)return;busy=true;status.setText(label);progress.setIndeterminate(true);progress.setVisible(true);updateButtons();
        active=new SwingWorker<T,Void>() {
            @Override protected T doInBackground() throws Exception {return action.call();}
            @Override protected void done() {
                busy=false;active=null;progress.setVisible(false);updateButtons();
                try{success.accept(get());}catch(CancellationException error){status.setText("Task cancelled.");}catch(Exception error){showError(error instanceof ExecutionException && error.getCause()!=null?error.getCause():error);}
            }
        };active.execute();
    }
    private void report(String text){SwingUtilities.invokeLater(()->{if(busy)status.setText(text);});}
    private void showError(Throwable error){status.setText("Error: "+error.getMessage());JOptionPane.showMessageDialog(this,error.getMessage(),"Asset Shelf",JOptionPane.ERROR_MESSAGE);}
    private Catalog.Asset selected(){int row=table.getSelectedRow();return row<0?null:model.assets.get(table.convertRowIndexToModel(row));}
    private List<Catalog.Asset> visible(){List<Catalog.Asset> rows=new ArrayList<>();for(int row=0;row<table.getRowCount();row++)rows.add(model.assets.get(table.convertRowIndexToModel(row)));return List.copyOf(rows);}
    private void filter(){String query=search.getText().trim().toLowerCase(Locale.ROOT);String type=(String)category.getSelectedItem();sorter.setRowFilter(new RowFilter<>(){public boolean include(Entry<? extends AssetModel,? extends Integer> entry){Catalog.Asset a=model.assets.get(entry.getIdentifier());return ("All types".equals(type)||a.kind().equals(type))&&(!duplicateOnly.isSelected()||duplicates.containsKey(a.path()))&&(a.relative()+" "+a.kind()+" "+(tags==null?"":tags.get(a.path()))).toLowerCase(Locale.ROOT).contains(query);}});updateButtons();}
    private void updateButtons(){boolean loaded=catalog!=null;for(JButton button:List.of(choose,refresh,findDuplicates,rename,undoButton,csv,json,saveTags,play))button.setEnabled(!busy);refresh.setEnabled(!busy&&loaded);findDuplicates.setEnabled(!busy&&loaded);rename.setEnabled(!busy&&table.getSelectedRowCount()>0);undoButton.setEnabled(!busy&&undoPlan!=null);csv.setEnabled(!busy&&loaded);json.setEnabled(!busy&&loaded);saveTags.setEnabled(!busy&&selected()!=null);Catalog.Asset a=selected();play.setEnabled(!busy&&a!=null&&Catalog.extension(a.path()).equals("wav"));cancel.setEnabled(busy);}
    private record PreviewResult(BufferedImage image,String note){}
    private static PreviewResult readPreview(Path file) throws IOException {
        if(!Files.isRegularFile(file,LinkOption.NOFOLLOW_LINKS)||Files.size(file)>32L*1024*1024)return new PreviewResult(null,"Preview unavailable: file missing, linked or over 32 MB.");
        try(ImageInputStream stream=ImageIO.createImageInputStream(file.toFile())){
            if(stream==null)return new PreviewResult(null,"No image decoder available.");
            Iterator<ImageReader> readers=ImageIO.getImageReaders(stream);if(!readers.hasNext())return new PreviewResult(null,"Metadata only: no built-in image decoder for this format.");
            ImageReader reader=readers.next();try{reader.setInput(stream,true,true);int width=reader.getWidth(0),height=reader.getHeight(0);if((long)width*height>25000000)return new PreviewResult(null,"Preview skipped: more than 25 million pixels.");ImageReadParam params=reader.getDefaultReadParam();int sampling=Math.max(1,(int)Math.ceil(Math.max(width,height)/1024.0));params.setSourceSubsampling(sampling,sampling,0,0);return new PreviewResult(reader.read(0,params),width+" × "+height+" px / first frame");}finally{reader.dispose();}
        }
    }
    private void inspect(){stopAudio();Catalog.Asset a=selected();long version=++previewVersion;updateButtons();preview.image=null;preview.note="Select an asset";preview.repaint();if(a==null)return;
        tagInput.setText(tags==null?"":tags.get(a.path()));String info=a.relative()+"\n\nType: "+a.kind()+"\nSize: "+a.size()+" bytes\nModified: "+a.modified()+"\nDuplicate: "+duplicates.getOrDefault(a.path(),"Not grouped / not checked")+"\n\n";details.setText(info);
        if(!a.kind().equals("Image")){preview.note=a.kind().equals("Audio")?"Audio file / WAV playback below":"Model file / metadata preview";preview.repaint();return;}
        preview.note="Loading image…";new SwingWorker<PreviewResult,Void>(){protected PreviewResult doInBackground()throws Exception{return readPreview(a.path());}protected void done(){if(version!=previewVersion)return;try{PreviewResult result=get();preview.image=result.image();preview.note=result.note();details.setText(info+result.note());preview.repaint();}catch(Exception error){preview.note="Image preview unavailable";preview.repaint();}}}.execute();
    }
    private void saveTags(){Catalog.Asset a=selected();if(a==null)return;String value=tagInput.getText();runTask("Saving tags…",()->{tags.set(a.path(),value);return true;},result->{model.fireTableDataChanged();filter();status.setText("Tags saved locally in asset-shelf-tags.properties.");});cancel.setEnabled(false);}
    private void prepareRename(){List<Path> paths=new ArrayList<>();for(int row:table.getSelectedRows())paths.add(model.assets.get(table.convertRowIndexToModel(row)).path());String prefix=JOptionPane.showInputDialog(this,"Prefix for selected files (example: dungeon)","Batch rename preview",JOptionPane.PLAIN_MESSAGE);if(prefix==null)return;
        runTask("Preparing rename preview…",()->RenameService.plan(catalog.root(),paths,prefix.trim()),plan->{if(plan.changes().isEmpty()){status.setText("Selected filenames already match this plan.");return;}JTextArea text=new JTextArea(16,64);text.setEditable(false);for(var change:plan.changes())text.append(catalog.root().relativize(change.source())+" → "+change.target().getFileName()+"\n");int answer=JOptionPane.showConfirmDialog(this,new JScrollPane(text),"Apply "+plan.changes().size()+" file renames?",JOptionPane.OK_CANCEL_OPTION,JOptionPane.WARNING_MESSAGE);if(answer!=JOptionPane.OK_OPTION)return;
            // Mutating operations are deliberately not cancellable mid-transaction.
            runTask("Renaming selected files…",()->{RenameService.apply(plan);String warning="";try{tags.remap(plan.changes(),false);}catch(IOException error){warning="Files renamed, but tag mapping could not be saved: "+error.getMessage();}return warning;},warning->{undoPlan=plan;if(!warning.isEmpty())JOptionPane.showMessageDialog(this,warning);scanFolder(catalog.root());});cancel.setEnabled(false);
        });
    }
    private void undoRename(){RenameService.Plan plan=undoPlan;if(plan==null)return;runTask("Verifying files and undoing rename…",()->{RenameService.undo(plan);String warning="";try{tags.remap(plan.changes(),true);}catch(IOException error){warning="Files restored, but tag mapping could not be saved: "+error.getMessage();}return warning;},warning->{undoPlan=null;if(!warning.isEmpty())JOptionPane.showMessageDialog(this,warning);scanFolder(catalog.root());});cancel.setEnabled(false);}
    private void export(boolean asJson){if(catalog==null)return;JFileChooser chooser=new JFileChooser();chooser.setSelectedFile(new File(asJson?"asset-catalog.json":"asset-catalog.csv"));if(chooser.showSaveDialog(this)!=JFileChooser.APPROVE_OPTION)return;Path path=chooser.getSelectedFile().toPath();List<Catalog.Asset> rows=visible();runTask("Exporting "+rows.size()+" visible assets…",()->{Exports.save(path,asJson?Exports.json(rows,tags,duplicates):Exports.csv(rows,tags,duplicates));return path;},result->status.setText("Exported "+rows.size()+" visible assets to "+result));cancel.setEnabled(false);}
    private void stopAudio(){if(clip!=null){clip.stop();clip.close();clip=null;}}
    private void playAudio(){Catalog.Asset a=selected();if(a==null)return;stopAudio();long version=previewVersion;runTask("Opening WAV…",()->{if(Files.size(a.path())>20L*1024*1024)throw new IOException("WAV playback is limited to 20 MB.");Clip next=AudioSystem.getClip();try(AudioInputStream stream=AudioSystem.getAudioInputStream(a.path().toFile())){next.open(stream);}catch(Exception error){next.close();throw error;}return next;},result->{if(version!=previewVersion){result.close();return;}clip=result;clip.start();status.setText("Playing WAV. Stop or select another asset to release audio.");});cancel.setEnabled(false);}
    void selectRelativeForTest(String name){for(int row=0;row<table.getRowCount();row++)if(model.assets.get(table.convertRowIndexToModel(row)).relative().equals(name)){table.setRowSelectionInterval(row,row);return;}throw new IllegalArgumentException(name);}
    boolean previewReady(){return preview.image!=null;}
    void searchForTest(String query){search.setText(query);}
    int visibleCountForTest(){return table.getRowCount();}
    public void close(){if(active!=null)active.cancel(true);stopAudio();previewVersion++;}
    private final class AssetModel extends AbstractTableModel {
        private static final long serialVersionUID=1L;private List<Catalog.Asset> assets=List.of();private final String[] names={"ASSET / RELATIVE PATH","TYPE","SIZE","TAGS","DUPLICATE"};
        public int getRowCount(){return assets.size();}public int getColumnCount(){return names.length;}public String getColumnName(int col){return names[col];}
        public Object getValueAt(int row,int col){Catalog.Asset a=assets.get(row);return switch(col){case 0->a.relative();case 1->a.kind();case 2->new DecimalFormat("0.#").format(a.size()/1024.0)+" KB";case 3->tags==null?"":tags.get(a.path());default->duplicates.getOrDefault(a.path(),"—");};}
    }
    private static final class ImagePreview extends JPanel {
        private static final long serialVersionUID=1L;BufferedImage image;String note="Select an asset";
        @Override protected void paintComponent(Graphics graphics){super.paintComponent(graphics);Graphics2D g=(Graphics2D)graphics.create();int w=getWidth(),h=getHeight();for(int y=0;y<h;y+=16)for(int x=0;x<w;x+=16){g.setColor(((x+y)/16)%2==0?new Color(220,228,219):new Color(237,241,234));g.fillRect(x,y,16,16);}if(image!=null){double scale=Math.min((w-28.0)/image.getWidth(),(h-28.0)/image.getHeight());int iw=(int)(image.getWidth()*scale),ih=(int)(image.getHeight()*scale);g.setRenderingHint(RenderingHints.KEY_INTERPOLATION,RenderingHints.VALUE_INTERPOLATION_NEAREST_NEIGHBOR);g.drawImage(image,(w-iw)/2,(h-ih)/2,iw,ih,null);}else{g.setColor(new Color(55,76,64));g.setFont(new Font(Font.SANS_SERIF,Font.PLAIN,12));g.drawString(note,15,h/2);}g.dispose();}
    }
    public static void main(String[] args) throws Exception {
        if(GraphicsEnvironment.isHeadless()){System.err.println("Asset Shelf needs a graphical desktop. Run tests with test.sh for headless verification.");return;}
        Path demo=args.length>0&&args[0].equals("--demo")?SamplePack.create():null;
        SwingUtilities.invokeLater(()->{theme();JFrame frame=new JFrame("Asset Shelf · Wild Strokes");App app=new App();frame.setContentPane(app);frame.setDefaultCloseOperation(WindowConstants.DO_NOTHING_ON_CLOSE);frame.addWindowListener(new java.awt.event.WindowAdapter(){@Override public void windowClosing(java.awt.event.WindowEvent event){if(app.busy){app.status.setText("Wait for the current task to finish before closing.");return;}frame.dispose();}@Override public void windowClosed(java.awt.event.WindowEvent event){app.close();}});frame.setSize(1240,860);frame.setMinimumSize(new Dimension(1050,760));frame.setLocationRelativeTo(null);frame.setVisible(true);if(demo!=null)app.scanFolder(demo);});
    }
}
