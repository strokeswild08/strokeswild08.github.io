using UnityEngine;
namespace Strokes.Combat
{
    [RequireComponent(typeof(CombatActor))]
    public sealed class EnemyBrain : MonoBehaviour
    {
        public CombatActor target;
        public float attackDistance = 1.8f;
        private CombatActor actor;
        private float nextDecision;
        private void Awake() { actor = GetComponent<CombatActor>(); }
        private void Update()
        {
            actor.MoveIntent = Vector3.zero;
            if (!actor.Alive || target == null || !target.Alive) return;
            Vector3 delta = target.transform.position - transform.position; delta.y = 0;
            actor.Face(target.transform.position);
            if (delta.magnitude > attackDistance) actor.MoveIntent = delta.normalized;
            else if (Time.time >= nextDecision && !actor.IsAttacking)
            {
                actor.TryAttack(false); nextDecision = Time.time + Random.Range(1.1f, 1.8f);
            }
        }
    }
}
