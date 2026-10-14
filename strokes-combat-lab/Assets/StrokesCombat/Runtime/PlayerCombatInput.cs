using UnityEngine;
namespace Strokes.Combat
{
    [RequireComponent(typeof(CombatActor))]
    public sealed class PlayerCombatInput : MonoBehaviour
    {
        private CombatActor actor;
        private Camera view;
        private void Awake() { actor = GetComponent<CombatActor>(); }
        private void Update()
        {
#if ENABLE_LEGACY_INPUT_MANAGER
            if (view == null) view = Camera.main;
            float x = (Input.GetKey(KeyCode.D) ? 1 : 0) - (Input.GetKey(KeyCode.A) ? 1 : 0);
            float z = (Input.GetKey(KeyCode.W) ? 1 : 0) - (Input.GetKey(KeyCode.S) ? 1 : 0);
            actor.MoveIntent = new Vector3(x, 0, z).normalized;
            if (view != null)
            {
                var plane = new Plane(Vector3.up, transform.position);
                Ray ray = view.ScreenPointToRay(Input.mousePosition);
                if (plane.Raycast(ray, out float distance)) actor.Face(ray.GetPoint(distance));
            }
            if (Input.GetMouseButtonDown(0) || Input.GetKeyDown(KeyCode.J)) actor.TryAttack(false);
            if (Input.GetMouseButtonDown(1) || Input.GetKeyDown(KeyCode.K)) actor.TryAttack(true);
            if (Input.GetKeyDown(KeyCode.Space)) actor.TryDodge(actor.MoveIntent);
#endif
        }
    }
}
