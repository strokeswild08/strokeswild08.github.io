using System;
namespace Strokes.Combat
{
    // Plain C# resource rules, independent of frame rate and scene objects.
    public sealed class CombatResources
    {
        public float Health { get; private set; }
        public float Stamina { get; private set; }
        public float MaxHealth { get; }
        public float MaxStamina { get; }
        public bool Alive => Health > 0;
        private float regenDelay;
        public CombatResources(float health, float stamina)
        {
            if (health <= 0 || stamina <= 0) throw new ArgumentOutOfRangeException();
            MaxHealth = Health = health; MaxStamina = Stamina = stamina;
        }
        public bool Spend(float cost)
        {
            if (cost < 0) throw new ArgumentOutOfRangeException(nameof(cost));
            if (!Alive || Stamina < cost) return false;
            Stamina -= cost; regenDelay = 0.8f; return true;
        }
        public void Damage(float amount)
        {
            if (amount < 0) throw new ArgumentOutOfRangeException(nameof(amount));
            Health = Math.Max(0, Health - amount);
        }
        public void Tick(float delta, float regenRate)
        {
            if (delta < 0 || regenRate < 0) throw new ArgumentOutOfRangeException();
            if (!Alive) return;
            float available = Math.Max(0, delta - regenDelay);
            regenDelay = Math.Max(0, regenDelay - delta);
            Stamina = Math.Min(MaxStamina, Stamina + available * regenRate);
        }
    }
}
