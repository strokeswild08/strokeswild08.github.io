package shelf;
import javax.swing.*;
import java.awt.*;
import java.awt.image.BufferedImage;
import java.nio.file.*;
import javax.imageio.ImageIO;

public final class UiSmoke {
    private static void layout(Container container){container.doLayout();for(Component child:container.getComponents())if(child instanceof Container nested)layout(nested);}
    public static void main(String[] args)throws Exception {
        Path root=SamplePack.create();Catalog.Scan scan=Catalog.scan(root,text->{});App[] panel=new App[1];
        SwingUtilities.invokeAndWait(()->{App.theme();App app=new App();panel[0]=app;try{app.load(scan);}catch(Exception error){throw new RuntimeException(error);}app.setSize(1240,820);layout(app);if(app.visibleCountForTest()!=8)throw new AssertionError("Sample scan rows");app.searchForTest("player");if(app.visibleCountForTest()!=1)throw new AssertionError("Tag filtering");app.searchForTest("");app.selectRelativeForTest("sprites/lantern_keeper.png");});
        for(int i=0;i<100;i++){boolean[] ready={false};SwingUtilities.invokeAndWait(()->ready[0]=panel[0].previewReady());if(ready[0])break;Thread.sleep(25);}
        SwingUtilities.invokeAndWait(()->{if(!panel[0].previewReady())throw new AssertionError("Image preview decode");layout(panel[0]);if(args.length>0){BufferedImage image=new BufferedImage(1240,820,BufferedImage.TYPE_INT_RGB);Graphics2D g=image.createGraphics();panel[0].paint(g);g.dispose();try{ImageIO.write(image,"png",Path.of(args[0]).toFile());}catch(Exception error){throw new RuntimeException(error);}}panel[0].close();});
        System.out.println("Swing panel load, tag filter and image preview passed (offscreen/headless).");
    }
}
