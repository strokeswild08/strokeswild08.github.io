package shelf;
import java.awt.*;
import java.awt.image.BufferedImage;
import java.io.*;
import java.nio.file.*;
import javax.imageio.ImageIO;
import javax.sound.sampled.*;

public final class SamplePack {
    private SamplePack() {}
    public static Path create() throws Exception {
        Path root=Files.createTempDirectory("asset-shelf-demo-");
        Path sprites=Files.createDirectories(root.resolve("sprites"));Path sounds=Files.createDirectories(root.resolve("sounds"));Path models=Files.createDirectories(root.resolve("models"));
        image(sprites.resolve("lantern_keeper.png"),0);image(sprites.resolve("moss_slime.png"),1);image(sprites.resolve("brass_key.png"),2);image(sprites.resolve("ember_shard.png"),3);
        Files.copy(sprites.resolve("lantern_keeper.png"),sprites.resolve("lantern_keeper_copy.png"));
        wave(sounds.resolve("ui_confirm.wav"),640);wave(sounds.resolve("soft_impact.wav"),180);
        Files.writeString(models.resolve("training_cube.obj"),"# Original sample cube\nv -1 -1 -1\nv 1 -1 -1\nv 1 1 -1\nv -1 1 -1\nv -1 -1 1\nv 1 -1 1\nv 1 1 1\nv -1 1 1\nf 1 2 3 4\nf 5 8 7 6\nf 1 5 6 2\nf 4 3 7 8\nf 2 6 7 3\nf 1 4 8 5\n");
        TagStore tags=new TagStore(root);tags.set(sprites.resolve("lantern_keeper.png"),"character, player, idle");tags.set(sprites.resolve("moss_slime.png"),"enemy, forest");tags.set(sounds.resolve("ui_confirm.wav"),"interface, confirm");
        return root;
    }
    private static void image(Path file,int type)throws IOException {
        BufferedImage image=new BufferedImage(32,32,BufferedImage.TYPE_INT_ARGB);Graphics2D g=image.createGraphics();
        if(type==0){g.setColor(new Color(37,63,53));g.fillRect(9,14,14,13);g.fillRect(9,27,5,3);g.fillRect(18,27,5,3);g.setColor(new Color(229,175,102));g.fillRect(11,6,10,8);g.setColor(new Color(68,128,96));g.fillRect(9,3,14,5);g.fillRect(6,7,20,3);g.fillRect(7,14,4,10);g.setColor(new Color(250,221,133));g.fillRect(24,19,5,7);g.setColor(new Color(152,101,53));g.fillRect(23,18,7,2);g.fillRect(23,25,7,2);}
        else if(type==1){g.setColor(new Color(60,107,72));g.fillRect(5,17,22,10);g.fillRect(9,12,14,7);g.setColor(new Color(113,177,92));g.fillRect(9,15,14,9);g.setColor(new Color(241,232,199));g.fillRect(10,18,3,3);g.fillRect(19,18,3,3);}
        else if(type==2){g.setColor(new Color(218,170,64));g.fillRect(7,10,10,10);g.fillRect(16,14,12,4);g.fillRect(24,17,3,5);g.setComposite(AlphaComposite.Clear);g.fillRect(10,13,4,4);}
        else {g.setColor(new Color(237,117,61));g.fillPolygon(new int[]{16,24,20,9},new int[]{4,16,28,20},4);g.setColor(new Color(255,208,121));g.fillPolygon(new int[]{16,20,16,12},new int[]{8,17,23,18},4);}
        g.dispose();ImageIO.write(image,"png",file.toFile());
    }
    private static void wave(Path file,double frequency)throws IOException {
        int rate=22050,length=rate/4;byte[] pcm=new byte[length*2];for(int i=0;i<length;i++){double envelope=1.0-i/(double)length;short sample=(short)(Math.sin(2*Math.PI*frequency*i/rate)*envelope*9000);pcm[i*2]=(byte)sample;pcm[i*2+1]=(byte)(sample>>8);}
        AudioFormat format=new AudioFormat(rate,16,1,true,false);try(AudioInputStream stream=new AudioInputStream(new ByteArrayInputStream(pcm),format,length)){AudioSystem.write(stream,AudioFileFormat.Type.WAVE,file.toFile());}
    }
}
