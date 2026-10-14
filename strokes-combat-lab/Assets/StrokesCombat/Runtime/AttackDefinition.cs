using UnityEngine;
namespace Strokes.Combat
{
    [CreateAssetMenu(menuName = "Strokes/Combat/Attack")]
    public sealed class AttackDefinition : ScriptableObject
    {
        [Min(0)] public float damage = 15, stamina = 12;
        [Min(0.01f)] public float windup = 0.18f, active = 0.12f, recovery = 0.25f;
        [Min(0.1f)] public float range = 2.1f;
        [Range(1, 180)] public float halfAngle = 55;
        [Min(0)] public float knockback = 2, hitStun = 0.18f;
        public Color color = new Color(0.3f, 0.9f, 1);
        public static AttackDefinition Make(string label, float damage, float cost, float windup,
            float active, float recovery, float range, float halfAngle, Color color)
        {
            var a = CreateInstance<AttackDefinition>(); a.name = label;
            a.damage = damage; a.stamina = cost; a.windup = windup; a.active = active;
            a.recovery = recovery; a.range = range; a.halfAngle = halfAngle; a.color = color;
            return a;
        }
    }
}
