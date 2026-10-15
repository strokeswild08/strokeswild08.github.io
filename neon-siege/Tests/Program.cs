using System;
using NeonSiege;
class Program
{
 static int n;
 static void Check(bool value,string name) { n++; if(!value) throw new Exception(name); }
 static void Main()
 {
  var p=new Weapon(Gun.Pistol); Check(p.Trigger() && p.Ammo==11,"trigger spends one round");
  Check(!p.Trigger(),"cooldown blocks rapid input"); Check(p.Reload(),"reload starts");
  Check(!p.Trigger() && !p.Reload(),"reload excludes fire and duplicate reload");
  p.Tick(1.3f); Check(!p.Reloading && p.Ammo==12,"reload refills");
  Check(!p.Reload(),"full magazine rejects reload");
  var b=new Weapon(Gun.Burst); Check(b.Trigger() && b.Ammo==23 && b.Pending==2,"burst starts with one shot");
  Check(!b.Reload() && !b.Trigger(),"burst blocks interruption");
  Check(b.Tick(.081f) && b.Ammo==22 && b.Pending==1,"second burst round");
  Check(b.Tick(.081f) && b.Ammo==21 && b.Pending==0,"third burst round");
  Check(!b.Tick(.01f),"no fourth burst shot");
  var s=new Weapon(Gun.Shotgun); Check(s.Pellets==5 && s.Trigger() && s.Ammo==5,"five pellets cost one shell");
  var empty=new Weapon(Gun.Pistol); for(int i=0;i<12;i++){ Check(empty.Trigger(),"round available"); empty.Tick(.3f); }
  Check(!empty.Trigger() && empty.Ammo==0,"empty weapon cannot fire");
  Check(empty.Reload(),"empty can reload"); empty.Tick(2); Check(empty.Ammo==12,"infinite reserve reload policy");
  var run=new Run(); Check(!run.Kill(0),"cannot kill unspawned enemy");
  Check(!run.Choose(0),"cannot upgrade during wave");
  Check(run.Hurt(30) && !run.Hurt(30) && run.Health==70,"contact damage cooldown");
  run.Tick(.61f); Check(run.Hurt(10) && run.Health==60,"damage after cooldown");
  int expected=0;
  for(int wave=1;wave<=5;wave++)
  {
   Check(run.Wave==wave && run.Target==4+wave*3,"wave budget");
   int target=run.Target;
   for(int i=0;i<target;i++) Check(run.Spawn(),"spawn budget accepted");
   Check(!run.Spawn(),"spawn budget caps");
   for(int i=0;i<target;i++) { Check(run.Kill(i%3),"kill tracked"); expected+=i%3==2 ? 150 : i%3==1 ? 100 : 50; }
   Check(run.Alive==0 && run.Score==expected,"score and alive accounting");
   if(wave<5)
   {
    Check(run.Phase==RunPhase.Upgrade,"wave waits for upgrade");
    Check(!run.Spawn() && !run.Hurt(10) && !run.Choose(99),"upgrade gate blocks simulation and invalid choice");
    Check(run.Choose((wave-1)%3) && run.Health==run.MaxHealth,"one choice advances and heals");
    Check(!run.Choose(0),"upgrade cannot be duplicated");
   }
  }
  Check(run.Phase==RunPhase.Won && !run.Spawn() && !run.Kill(0),"five waves ends run");
  var dead=new Run(); Check(dead.Hurt(1000) && dead.Phase==RunPhase.Lost && dead.Health==0,"death clamps health");
  Check(!dead.Hurt(5) && !dead.Spawn(),"lost run blocks actions");
  Check(run.DamageScale>1 && run.SpeedScale>1 && run.MaxHealth==125,"upgrade effects persist");
  Check(!new Run().Hurt(float.NaN),"NaN damage rejected");
  Console.WriteLine("PASS: "+n+" C# checks");
 }
}
