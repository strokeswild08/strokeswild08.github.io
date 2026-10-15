using System.Collections.Generic;
using UnityEngine;
using UnityEngine.Pool;
namespace NeonSiege
{
 public sealed class SiegeGame : MonoBehaviour
 {
  sealed class Enemy { public Vector3 P; public int Kind; public float Hp, Clock; public GameObject View; }
  sealed class Shot { public Vector3 P, V; public float Damage, Life; public bool Hostile; public GameObject View; }
  Run run; Weapon[] weapons; int selected; bool paused; float spawnClock, elapsed;
  Vector3 player, aim=Vector3.forward;
  Camera cam; GameObject pilot; readonly List<Enemy> enemies=new List<Enemy>(); readonly List<Shot> shots=new List<Shot>();
  ObjectPool<GameObject> enemyPool, shotPool;
  readonly Color cyan=new Color(.1f,.95f,1), pink=new Color(1,.18f,.5f);
  GUIStyle title, label, big;
  [RuntimeInitializeOnLoadMethod(RuntimeInitializeLoadType.AfterSceneLoad)]
  static void Boot() { if(FindFirstObjectByType<SiegeGame>()==null) new GameObject("Neon Siege").AddComponent<SiegeGame>(); }
  Material Mat(Color c)
  {
   var m=new Material(Shader.Find("Unlit/Color")); m.color=c; return m;
  }
  GameObject Shape(string name, PrimitiveType shape, Vector3 p, Vector3 scale, Color color)
  {
   var go=GameObject.CreatePrimitive(shape); go.name=name; go.transform.position=p; go.transform.localScale=scale;
   var collider=go.GetComponent<Collider>(); if(collider) Destroy(collider);
   go.GetComponent<Renderer>().sharedMaterial=Mat(color); return go;
  }
  void Awake()
  {
   Application.targetFrameRate=60;
   cam=Camera.main;
   if(!cam) { var c=new GameObject("Main Camera"); c.tag="MainCamera"; cam=c.AddComponent<Camera>(); }
   cam.transform.SetPositionAndRotation(new Vector3(0,35,0),Quaternion.Euler(90,0,0));
   cam.orthographic=true; cam.orthographicSize=17; cam.clearFlags=CameraClearFlags.SolidColor; cam.backgroundColor=new Color(.025f,.035f,.08f);
   Shape("Arena",PrimitiveType.Cube,new Vector3(0,-.35f,0),new Vector3(46,.5f,30),new Color(.035f,.055f,.10f));
   for(int i=-11;i<=11;i++) Shape("Grid",PrimitiveType.Cube,new Vector3(i*2,-.05f,0),new Vector3(.025f,.025f,30),new Color(.07f,.13f,.20f));
   for(int i=-7;i<=7;i++) Shape("Grid",PrimitiveType.Cube,new Vector3(0,-.05f,i*2),new Vector3(46,.025f,.025f),new Color(.07f,.13f,.20f));
   foreach(int sign in new[]{-1,1}) {
    Shape("Rail",PrimitiveType.Cube,new Vector3(sign*23,0,0),new Vector3(.12f,.12f,30),cyan);
    Shape("Rail",PrimitiveType.Cube,new Vector3(0,0,sign*15),new Vector3(46,.12f,.12f),pink);
   }
   pilot=Shape("Pilot",PrimitiveType.Capsule,Vector3.zero,new Vector3(.8f,.5f,.8f),cyan);
   enemyPool=new ObjectPool<GameObject>(()=>Shape("Enemy",PrimitiveType.Cube,Vector3.zero,Vector3.one,pink),go=>go.SetActive(true),go=>go.SetActive(false),go=>Destroy(go),false,24,80);
   shotPool=new ObjectPool<GameObject>(()=>Shape("Projectile",PrimitiveType.Sphere,Vector3.zero,new Vector3(.18f,.18f,.5f),cyan),go=>go.SetActive(true),go=>go.SetActive(false),go=>Destroy(go),false,96,400);
   ResetRun();
  }
  void ResetRun()
  {
   for(int i=shots.Count-1;i>=0;i--) shotPool.Release(shots[i].View); shots.Clear();
   foreach(var e in enemies) enemyPool.Release(e.View); enemies.Clear();
   run=new Run(); weapons=new[]{new Weapon(Gun.Pistol),new Weapon(Gun.Shotgun),new Weapon(Gun.Burst)};
   player=Vector3.zero; selected=0; spawnClock=.3f; elapsed=0; paused=false;
  }
  void Spawn()
  {
   if(!run.Spawn()) return;
   int kind=run.Wave==1 ? 0 : Random.Range(0,run.Wave==2 ? 2 : 3);
   Vector3 p=Random.value<.5f ? new Vector3(Random.value<.5f ? -22:22,0,Random.Range(-14f,14f)) : new Vector3(Random.Range(-22f,22f),0,Random.value<.5f ? -14:14);
   var e=new Enemy { P=p, Kind=kind, Hp=kind==2 ? 140 : kind==1 ? 55:50, Clock=1.2f, View=enemyPool.Get() };
   e.View.transform.localScale=Vector3.one*(kind==2 ? 1.6f:.85f);
   e.View.GetComponent<Renderer>().material.color=kind==2 ? new Color(1,.65f,.12f) : kind==1 ? new Color(.6f,.3f,1):pink;
   e.View.transform.position=p+Vector3.up*.5f; enemies.Add(e);
  }
  void Bullet(Vector3 p,Vector3 direction,float speed,float damage,bool hostile)
  {
   if(shots.Count>=350) return;
   var s=new Shot {P=p,V=direction*speed,Damage=damage,Life=2.2f,Hostile=hostile,View=shotPool.Get()};
   s.View.GetComponent<Renderer>().material.color=hostile ? pink:cyan;
   s.View.transform.position=p+Vector3.up*.5f; s.View.transform.rotation=Quaternion.LookRotation(direction);
   shots.Add(s);
  }
  void Fire(Weapon w)
  {
   for(int i=0;i<w.Pellets;i++) {
    var dir=Quaternion.Euler(0,w.Pellets>1 ? (i-2)*7:0,0)*aim;
    Bullet(player+dir*.7f,dir,36,w.Damage*run.DamageScale,false);
   }
  }
  public static float SegmentDistance(Vector3 point,Vector3 a,Vector3 b)
  {
   var line=b-a; float t=line.sqrMagnitude<.00001f ? 0:Mathf.Clamp01(Vector3.Dot(point-a,line)/line.sqrMagnitude);
   return Vector3.Distance(point,a+line*t);
  }
  void ClearProjectiles() { foreach(var s in shots) shotPool.Release(s.View); shots.Clear(); }
  void Choose(int option) { if(run.Choose(option)) { ClearProjectiles(); spawnClock=1; } }
  void Update()
  {
   if(Input.GetKeyDown(KeyCode.Escape)) paused=!paused;
   if(Input.GetKeyDown(KeyCode.Return) && (run.Phase==RunPhase.Lost || run.Phase==RunPhase.Won)) ResetRun();
   if(run.Phase==RunPhase.Upgrade) {
    if(Input.GetKeyDown(KeyCode.Alpha1)) Choose(0); if(Input.GetKeyDown(KeyCode.Alpha2)) Choose(1); if(Input.GetKeyDown(KeyCode.Alpha3)) Choose(2); return;
   }
   if(paused || run.Phase!=RunPhase.Playing) return;
   float dt=Mathf.Min(Time.deltaTime,.05f); elapsed+=dt; run.Tick(dt);
   var movement=new Vector3((Input.GetKey(KeyCode.D)?1:0)-(Input.GetKey(KeyCode.A)?1:0),0,(Input.GetKey(KeyCode.W)?1:0)-(Input.GetKey(KeyCode.S)?1:0)).normalized;
   player+=movement*8*run.SpeedScale*dt; player.x=Mathf.Clamp(player.x,-21.5f,21.5f); player.z=Mathf.Clamp(player.z,-13.5f,13.5f);
   var plane=new Plane(Vector3.up,Vector3.zero); var ray=cam.ScreenPointToRay(Input.mousePosition);
   if(plane.Raycast(ray,out float distance)) { var direction=ray.GetPoint(distance)-player; if(direction.sqrMagnitude>.01f) aim=direction.normalized; }
   pilot.transform.SetPositionAndRotation(player+Vector3.up*.6f,Quaternion.LookRotation(aim));
   pilot.GetComponent<Renderer>().material.color=run.HurtCooldown>.45f ? Color.white:cyan;
   if(Input.GetKeyDown(KeyCode.Alpha1)) selected=0; if(Input.GetKeyDown(KeyCode.Alpha2)) selected=1; if(Input.GetKeyDown(KeyCode.Alpha3)) selected=2;
   // Scheduled bursts retain their originating weapon's stats even if a weapon is switched.
   for(int i=0;i<weapons.Length;i++) if(weapons[i].Tick(dt)) Fire(weapons[i]);
   if(Input.GetKeyDown(KeyCode.R)) weapons[selected].Reload();
   if(Input.GetMouseButton(0) && weapons[selected].Trigger()) Fire(weapons[selected]);
   spawnClock-=dt; if(spawnClock<=0 && run.Spawned<run.Target) { Spawn(); spawnClock=Mathf.Max(.3f,.85f-run.Wave*.07f); }
   for(int i=enemies.Count-1;i>=0;i--) {
    var e=enemies[i]; var delta=player-e.P; float d=delta.magnitude; var dir=d>.001f ? delta/d:Vector3.forward;
    if(e.Kind!=1 || d>10) e.P+=dir*(e.Kind==2 ? 2.0f:e.Kind==1 ? 3:3.6f)*dt;
    else if(d<7) e.P-=dir*2*dt;
    e.P.x=Mathf.Clamp(e.P.x,-22,22); e.P.z=Mathf.Clamp(e.P.z,-14,14);
    e.Clock-=dt;
    if(e.Kind==1 && e.Clock<=0) { Bullet(e.P,dir,13,14,true); e.Clock=1.5f; }
    if(d<(e.Kind==2 ? 1.25f:.9f)) run.Hurt(e.Kind==2 ? 24:12);
    e.View.transform.SetPositionAndRotation(e.P+Vector3.up*.5f,Quaternion.LookRotation(dir));
   }
   for(int i=shots.Count-1;i>=0;i--) {
    var s=shots[i]; Vector3 old=s.P; s.P+=s.V*dt; s.Life-=dt; bool dead=s.Life<=0 || Mathf.Abs(s.P.x)>24 || Mathf.Abs(s.P.z)>16;
    if(!dead && s.Hostile && SegmentDistance(player,old,s.P)<.6f) { run.Hurt(s.Damage); dead=true; }
    if(!dead && !s.Hostile) {
     // Pick nearest intersected enemy along the segment, not list order.
     int best=-1; float nearest=float.MaxValue;
     for(int j=0;j<enemies.Count;j++) { var e=enemies[j]; if(SegmentDistance(e.P,old,s.P)<(e.Kind==2 ? 1.05f:.65f)) { float d=(e.P-old).sqrMagnitude; if(d<nearest) {nearest=d;best=j;} } }
     if(best>=0) {
      var e=enemies[best]; e.Hp-=s.Damage; dead=true;
      if(e.Hp<=0) { enemyPool.Release(e.View); enemies.RemoveAt(best); run.Kill(e.Kind); }
     }
    }
    if(dead) { shotPool.Release(s.View); shots.RemoveAt(i); }
    else s.View.transform.position=s.P+Vector3.up*.5f;
   }
   if(run.Phase!=RunPhase.Playing) ClearProjectiles();
  }
  void OnGUI()
  {
   if(run==null) return;
   if(title==null) {title=new GUIStyle(GUI.skin.label){fontSize=30}; label=new GUIStyle(GUI.skin.label){fontSize=17}; big=new GUIStyle(GUI.skin.button){fontSize=17};}
   float x=24; GUI.color=cyan; GUI.Label(new Rect(x,18,500,45),"NEON SIEGE / WILD STROKES",title); GUI.color=Color.white;
   GUI.Label(new Rect(x,64,900,30),"WAVE "+run.Wave+" / 5     ENEMIES "+enemies.Count+"     SCORE "+run.Score,label);
   GUI.Label(new Rect(x,96,900,30),"HEALTH "+Mathf.CeilToInt(run.Health)+" / "+run.MaxHealth+"     "+weapons[selected].Kind.ToString().ToUpper()+"  "+weapons[selected].Ammo+" / "+weapons[selected].Capacity+(weapons[selected].Reloading ? "  RELOADING":""),label);
   GUI.Label(new Rect(x,Screen.height-42,1000,30),"WASD Move | Mouse Aim | Hold LMB Fire | 1/2/3 Weapons | R Reload | ESC Pause",label);
   if(run.Phase==RunPhase.Upgrade) {
    GUI.Box(new Rect(Screen.width/2-260,Screen.height/2-110,520,240),"WAVE CLEAR — CHOOSE ONE / FULL HEAL");
    string[] names={"1 / Damage +25%","2 / Move speed +12%","3 / Max health +25"};
    for(int i=0;i<3;i++) if(GUI.Button(new Rect(Screen.width/2-235,Screen.height/2-70+i*62,470,52),names[i],big)) Choose(i);
   } else if(run.Phase==RunPhase.Won || run.Phase==RunPhase.Lost) {
    GUI.Box(new Rect(Screen.width/2-210,Screen.height/2-80,420,160),run.Phase==RunPhase.Won ? "ALL FIVE WAVES CLEARED":"RUN ENDED");
    if(GUI.Button(new Rect(Screen.width/2-180,Screen.height/2-20,360,60),"PLAY AGAIN / ENTER",big)) ResetRun();
   } else if(paused) {
    if(GUI.Button(new Rect(Screen.width/2-150,Screen.height/2-30,300,60),"RESUME / ESC",big)) paused=false;
   }
  }
  void OnDestroy()
  {
   if(enemyPool!=null) enemyPool.Clear(); if(shotPool!=null) shotPool.Clear();
  }
 }
}
