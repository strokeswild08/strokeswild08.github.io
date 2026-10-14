using System;
using System.Collections.Generic;
using UnityEngine;
namespace Strokes.Combat
{
    [RequireComponent(typeof(CharacterController))]
    public sealed class CombatActor : MonoBehaviour
    {
        public string displayName = "Fighter";
        public int team;
        public float moveSpeed = 4.6f;
        public AttackDefinition[] lightCombo;
        public AttackDefinition heavyAttack;
        public event Action<CombatActor> Hit;
        public CombatResources Resources { get; private set; }
        public bool Alive => Resources != null && Resources.Alive;
        public bool IsAttacking => attack != null;
        public bool IsDodging => dodgeLeft > 0;
        public string State => !Alive ? "DOWN" : IsDodging ? "DODGE" : stunLeft > 0 ? "STAGGER" :
            attack == null ? "READY" : attackClock < attack.windup ? "WINDUP" :
            attackClock < attack.windup + attack.active ? "STRIKE" : "RECOVERY";
        public Vector3 MoveIntent { get; set; }
        private CharacterController motor;
        private AttackDefinition attack;
        private float attackClock, dodgeLeft, dodgeElapsed, stunLeft, comboDeadline;
        private int nextCombo;
        private Vector3 dodgeDirection, push;
        private bool queuedLight;
        private readonly HashSet<CombatActor> struck = new HashSet<CombatActor>();
        private readonly Collider[] overlaps = new Collider[64];
        private Renderer body;
        private Material material;
        private Color baseColor;
        private float flash;
        private LineRenderer arc;
        private Material arcMaterial;
        private float verticalSpeed;
        private void Awake()
        {
            motor = GetComponent<CharacterController>();
            Resources = new CombatResources(100, 100);
            body = GetComponentInChildren<Renderer>();
            if (body != null) { material = body.material; baseColor = material.color; }
            arc = new GameObject("Attack arc").AddComponent<LineRenderer>();
            arc.transform.SetParent(transform, false); arc.useWorldSpace = false;
            arc.startWidth = arc.endWidth = 0.055f;
            arcMaterial = new Material(Shader.Find("Sprites/Default")); arc.material = arcMaterial;
            arc.enabled = false;
        }
        public bool TryAttack(bool heavy)
        {
            if (!Alive || IsDodging || stunLeft > 0) return false;
            if (attack != null)
            {
                // A single buffered light input is accepted only near recovery.
                if (!heavy && attackClock >= attack.windup + attack.active) queuedLight = true;
                return false;
            }
            if (lightCombo == null || lightCombo.Length == 0) return false;
            if (Time.time > comboDeadline) nextCombo = 0;
            var chosen = heavy ? heavyAttack : lightCombo[nextCombo % lightCombo.Length];
            if (chosen == null || !Resources.Spend(chosen.stamina)) return false;
            attack = chosen; attackClock = 0; struck.Clear(); queuedLight = false;
            nextCombo = heavy ? 0 : (nextCombo + 1) % lightCombo.Length;
            return true;
        }
        public bool TryDodge(Vector3 direction)
        {
            if (!Alive || IsDodging || attack != null || stunLeft > 0 || !Resources.Spend(25)) return false;
            direction.y = 0;
            dodgeDirection = direction.sqrMagnitude > 0.01f ? direction.normalized : transform.forward;
            dodgeElapsed = 0; dodgeLeft = 0.32f; return true;
        }
        private void Update()
        {
            float dt = Time.deltaTime;
            Resources.Tick(dt, 25); stunLeft = Mathf.Max(0, stunLeft - dt);
            flash = Mathf.Max(0, flash - dt);
            if (!Alive) { attack = null; queuedLight = false; arc.enabled = false; }
            if (attack != null && Alive) AdvanceAttack(dt);
            Vector3 movement = Vector3.zero;
            if (Alive && IsDodging)
            {
                dodgeElapsed += dt;
                movement = dodgeDirection * 11 * (Mathf.Min(dt, dodgeLeft) / Mathf.Max(dt, 0.0001f));
                dodgeLeft = Mathf.Max(0, dodgeLeft - dt);
            }
            else if (Alive && stunLeft <= 0)
            {
                movement = Vector3.ClampMagnitude(MoveIntent, 1) * moveSpeed * (attack != null ? 0.25f : 1);
                if (attack == null && MoveIntent.sqrMagnitude > 0.01f)
                    transform.rotation = Quaternion.RotateTowards(transform.rotation,
                        Quaternion.LookRotation(MoveIntent), 720 * dt);
            }
            if (motor.isGrounded && verticalSpeed < 0) verticalSpeed = -2;
            verticalSpeed += Physics.gravity.y * dt;
            if (motor.enabled) motor.Move((movement + push + Vector3.up * verticalSpeed) * dt);
            push = Vector3.MoveTowards(push, Vector3.zero, 16 * dt);
            if (material != null) material.color = !Alive ? Color.gray : flash > 0 ? Color.white :
                State == "WINDUP" ? new Color(1, 0.6f, 0.15f) : IsDodging ? Color.cyan : baseColor;
        }
        private void AdvanceAttack(float dt)
        {
            float previous = attackClock; attackClock += dt;
            float activeEnd = attack.windup + attack.active;
            // Interval overlap still resolves a strike if a long frame skips the active window.
            if (attackClock >= attack.windup && previous < activeEnd) ResolveHits();
            arc.enabled = attackClock < activeEnd;
            DrawArc();
            if (attackClock < activeEnd + attack.recovery) return;
            attack = null; arc.enabled = false; comboDeadline = Time.time + 0.55f;
            bool followup = queuedLight; queuedLight = false;
            if (followup) TryAttack(false);
        }
        private void DrawArc()
        {
            arc.positionCount = 25; arc.startColor = arc.endColor = attack.color;
            for (int i = 0; i < 25; i++)
            {
                float angle = Mathf.Lerp(-attack.halfAngle, attack.halfAngle, i / 24f) * Mathf.Deg2Rad;
                arc.SetPosition(i, new Vector3(Mathf.Sin(angle) * attack.range, 0.8f,
                    Mathf.Cos(angle) * attack.range));
            }
        }
        private void ResolveHits()
        {
            int count = Physics.OverlapSphereNonAlloc(transform.position + Vector3.up,
                attack.range + 0.5f, overlaps, ~0, QueryTriggerInteraction.Ignore);
            for (int i = 0; i < count; i++)
            {
                var victim = overlaps[i].GetComponentInParent<CombatActor>();
                if (victim == null || victim == this || victim.team == team || !victim.Alive || struck.Contains(victim)) continue;
                Vector3 delta = victim.transform.position - transform.position; delta.y = 0;
                if (delta.magnitude > attack.range || Vector3.Angle(transform.forward, delta) > attack.halfAngle) continue;
                Vector3 from = transform.position + Vector3.up;
                Vector3 to = victim.transform.position + Vector3.up;
                if (Physics.Linecast(from, to, out RaycastHit obstruction, ~0, QueryTriggerInteraction.Ignore)
                    && obstruction.collider.GetComponentInParent<CombatActor>() != victim) continue;
                struck.Add(victim);
                if (victim.ReceiveHit(attack, delta.normalized)) Hit?.Invoke(victim);
            }
        }
        private bool ReceiveHit(AttackDefinition source, Vector3 direction)
        {
            if (!Alive || (IsDodging && dodgeElapsed >= 0.04f && dodgeElapsed <= 0.22f)) return false;
            Resources.Damage(source.damage); flash = 0.1f; stunLeft = source.hitStun;
            attack = null; queuedLight = false; nextCombo = 0; arc.enabled = false;
            push = direction * source.knockback; return true;
        }
        public void Face(Vector3 point)
        {
            Vector3 d = point - transform.position; d.y = 0;
            if (d.sqrMagnitude > 0.01f && !IsAttacking && !IsDodging)
                transform.rotation = Quaternion.LookRotation(d);
        }
        private void OnDestroy()
        {
            if (material != null) Destroy(material);
            if (arcMaterial != null) Destroy(arcMaterial);
        }
    }
}
