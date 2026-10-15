using System;
namespace NeonSiege
{
    public enum Gun { Pistol, Shotgun, Burst }
    public enum RunPhase { Playing, Upgrade, Won, Lost }
    public sealed class Weapon
    {
        public readonly Gun Kind;
        public readonly int Capacity;
        public int Ammo { get; private set; }
        public int Pending { get; private set; }
        public bool Reloading { get; private set; }
        public float Timer { get; private set; }
        public float Cooldown { get; private set; }
        public int Pellets { get { return Kind == Gun.Shotgun ? 5 : 1; } }
        public float Damage { get { return Kind == Gun.Shotgun ? 12 : Kind == Gun.Burst ? 14 : 25; } }
        public Weapon(Gun kind) { Kind=kind; Capacity=kind==Gun.Pistol ? 12 : kind==Gun.Shotgun ? 6 : 24; Ammo=Capacity; }
        public bool Reload()
        {
            if (Reloading || Ammo==Capacity || Pending>0) return false;
            Reloading=true; Timer=Kind==Gun.Shotgun ? 1.7f : 1.2f; return true;
        }
        public bool Trigger()
        {
            if (Reloading || Cooldown>0 || Pending>0 || Ammo<=0) return false;
            if (Kind==Gun.Burst) Pending=Math.Min(3,Ammo)-1;
            Ammo--; Cooldown=Pending>0 ? .08f : (Kind==Gun.Shotgun ? .60f : Kind==Gun.Burst ? .35f : .22f);
            return true;
        }
        // A true result requests the next scheduled burst projectile from the presentation layer.
        public bool Tick(float dt)
        {
            if (float.IsNaN(dt) || float.IsInfinity(dt) || dt<=0) return false;
            Cooldown=Math.Max(0,Cooldown-dt);
            if (Reloading) { Timer-=dt; if(Timer<=0) { Reloading=false; Ammo=Capacity; } }
            if (Pending>0 && Cooldown<=0)
            {
                Pending--; Ammo--; Cooldown=Pending>0 ? .08f : .35f; return true;
            }
            return false;
        }
    }
    public sealed class Run
    {
        public RunPhase Phase { get; private set; } = RunPhase.Playing;
        public int Wave { get; private set; } = 1;
        public int Spawned { get; private set; }
        public int Kills { get; private set; }
        public int Score { get; private set; }
        public int Alive { get { return Spawned-Kills; } }
        public int Target { get { return 4+Wave*3; } }
        public float Health { get; private set; } = 100;
        public float MaxHealth { get; private set; } = 100;
        public float DamageScale { get; private set; } = 1;
        public float SpeedScale { get; private set; } = 1;
        public float HurtCooldown { get; private set; }
        public bool Spawn()
        {
            if (Phase!=RunPhase.Playing || Spawned>=Target) return false;
            Spawned++; return true;
        }
        public bool Kill(int kind)
        {
            if (Phase!=RunPhase.Playing || Alive<=0) return false;
            Kills++; Score+=kind==2 ? 150 : kind==1 ? 100 : 50;
            if(Kills==Target) Phase=Wave==5 ? RunPhase.Won : RunPhase.Upgrade;
            return true;
        }
        public bool Choose(int choice)
        {
            if (Phase!=RunPhase.Upgrade || choice<0 || choice>2) return false;
            if(choice==0) DamageScale+=.25f;
            if(choice==1) SpeedScale+=.12f;
            if(choice==2) MaxHealth+=25;
            Health=MaxHealth; Wave++; Spawned=0; Kills=0; Phase=RunPhase.Playing;
            return true;
        }
        public bool Hurt(float damage)
        {
            if(Phase!=RunPhase.Playing || HurtCooldown>0 || damage<=0 || float.IsNaN(damage) || float.IsInfinity(damage)) return false;
            Health=Math.Max(0,Health-damage); HurtCooldown=.6f;
            if(Health<=0) Phase=RunPhase.Lost;
            return true;
        }
        public void Tick(float dt)
        {
            if(Phase==RunPhase.Playing && dt>0 && !float.IsInfinity(dt) && !float.IsNaN(dt)) HurtCooldown=Math.Max(0,HurtCooldown-dt);
        }
    }
}
