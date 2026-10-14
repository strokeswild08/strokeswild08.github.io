using System.Collections.Generic;
using UnityEngine;
namespace Strokes.Combat
{
    public sealed class CombatDemo : MonoBehaviour
    {
        private CombatActor player;
        private readonly List<CombatActor> enemies = new List<CombatActor>();
        private readonly List<Object> owned = new List<Object>();
        private Transform arena;
        private Camera view;
        private AudioSource audioSource;
        private AudioClip impact;
        private float shake;
        private int hits;
        private bool paused;
        private GUIStyle title, normal;
        private void Start()
        {
            view = Camera.main;
            if (view == null) { var c = new GameObject("Arena Camera"); c.tag = "MainCamera"; view = c.AddComponent<Camera>(); c.AddComponent<AudioListener>(); }
            view.orthographic = true; view.orthographicSize = 11;
            view.backgroundColor = new Color(0.025f, 0.035f, 0.055f); view.clearFlags = CameraClearFlags.SolidColor;
            view.transform.rotation = Quaternion.Euler(56, 0, 0);
            audioSource = gameObject.AddComponent<AudioSource>();
            impact = AudioClip.Create("Synth impact", 4410, 1, 44100, false);
            var samples = new float[4410];
            for (int i = 0; i < samples.Length; i++) samples[i] = Mathf.Sin(i * 0.021f) * Mathf.Exp(-i / 550f) * 0.2f;
            impact.SetData(samples, 0); owned.Add(impact);
            Build();
        }
        private Material MakeMaterial(Color color)
        {
            Shader shader = Shader.Find("Universal Render Pipeline/Lit");
            if (shader == null) shader = Shader.Find("Standard");
            var m = new Material(shader); m.color = color; owned.Add(m); return m;
        }
        private GameObject Block(string label, Vector3 position, Vector3 scale, Color color)
        {
            var g = GameObject.CreatePrimitive(PrimitiveType.Cube); g.name = label;
            g.transform.SetParent(arena); g.transform.position = position; g.transform.localScale = scale;
            g.GetComponent<Renderer>().sharedMaterial = MakeMaterial(color); return g;
        }
        private CombatActor Fighter(string label, Vector3 position, int team, Color color)
        {
            var root = new GameObject(label); root.transform.SetParent(arena); root.transform.position = position;
            var capsule = GameObject.CreatePrimitive(PrimitiveType.Capsule);
            capsule.transform.SetParent(root.transform, false); capsule.transform.localPosition = Vector3.up;
            // Disable immediately; Destroy is deferred until the end of the frame.
            capsule.GetComponent<Collider>().enabled = false; Destroy(capsule.GetComponent<Collider>());
            capsule.GetComponent<Renderer>().sharedMaterial = MakeMaterial(color);
            var controller = root.AddComponent<CharacterController>(); controller.height = 2; controller.radius = 0.4f; controller.center = Vector3.up;
            var fighter = root.AddComponent<CombatActor>(); fighter.displayName = label; fighter.team = team;
            fighter.lightCombo = new[] {
                AttackDefinition.Make("Jab", 14, 10, .16f, .1f, .2f, 2.1f, 50, Color.cyan),
                AttackDefinition.Make("Cross", 18, 14, .2f, .12f, .24f, 2.3f, 60, Color.cyan),
                AttackDefinition.Make("Finisher", 26, 20, .28f, .16f, .38f, 2.5f, 75, Color.white) };
            fighter.heavyAttack = AttackDefinition.Make("Heavy", 36, 30, .5f, .18f, .5f, 2.7f, 65, new Color(1, .5f, .15f));
            foreach (var a in fighter.lightCombo) owned.Add(a); owned.Add(fighter.heavyAttack);
            fighter.Hit += OnHit;
            var marker = GameObject.CreatePrimitive(PrimitiveType.Cube); marker.transform.SetParent(root.transform, false);
            marker.transform.localPosition = new Vector3(0, 1.1f, .55f); marker.transform.localScale = new Vector3(.2f, .15f, .5f);
            marker.GetComponent<Collider>().enabled = false; Destroy(marker.GetComponent<Collider>());
            marker.GetComponent<Renderer>().sharedMaterial = MakeMaterial(Color.white);
            return fighter;
        }
        private void Build()
        {
            arena = new GameObject("Training Arena").transform;
            var floor = new Color(.065f, .09f, .12f); var wall = new Color(.12f, .18f, .23f);
            Block("Floor", new Vector3(0, -.25f, 0), new Vector3(22, .5f, 18), floor);
            Block("North", new Vector3(0, 1, 9), new Vector3(22, 2, .5f), wall);
            Block("South", new Vector3(0, 1, -9), new Vector3(22, 2, .5f), wall);
            Block("West", new Vector3(-11, 1, 0), new Vector3(.5f, 2, 18), wall);
            Block("East", new Vector3(11, 1, 0), new Vector3(.5f, 2, 18), wall);
            for (int i = -4; i <= 4; i++)
                Block("Floor inlay", new Vector3(i * 2, .008f, 0), new Vector3(.025f, .01f, 17), wall);
            var light = new GameObject("Arena Light"); light.transform.SetParent(arena);
            var lamp = light.AddComponent<Light>(); lamp.type = LightType.Directional; lamp.intensity = 1.2f;
            light.transform.rotation = Quaternion.Euler(55, -30, 0);
            player = Fighter("OWAIS", new Vector3(0, 0, -3), 0, new Color(.15f, .7f, .85f));
            player.gameObject.AddComponent<PlayerCombatInput>();
            for (int i = 0; i < 3; i++)
            {
                var enemy = Fighter("SENTINEL " + (i + 1), new Vector3((i - 1) * 4, 0, 4), 1, new Color(.8f, .25f, .18f));
                enemy.moveSpeed = 2.1f + i * .15f;
                var ai = enemy.gameObject.AddComponent<EnemyBrain>(); ai.target = player; enemies.Add(enemy);
            }
        }
        private void OnHit(CombatActor victim)
        {
            if (victim.team != 0) hits++;
            shake = .12f; audioSource.PlayOneShot(impact);
        }
        private void Update()
        {
#if ENABLE_LEGACY_INPUT_MANAGER
            if (Input.GetKeyDown(KeyCode.Escape)) { paused = !paused; Time.timeScale = paused ? 0 : 1; }
            if (Input.GetKeyDown(KeyCode.R)) Restart();
#endif
        }
        private void LateUpdate()
        {
            if (view == null || player == null) return;
            shake = Mathf.Max(0, shake - Time.unscaledDeltaTime);
            Vector3 focus = player.transform.position * .25f;
            view.transform.position = focus + new Vector3(0, 15, -10) + Random.insideUnitSphere * shake;
        }
        private int Remaining()
        {
            int count = 0; foreach (var e in enemies) if (e != null && e.Alive) count++; return count;
        }
        private void Restart()
        {
            Time.timeScale = 1; paused = false; hits = 0; shake = 0;
            arena.gameObject.SetActive(false); Destroy(arena.gameObject); enemies.Clear();
            // Retain the shared audio clip, release per-round materials and attack data.
            foreach (var o in owned) if (o != impact) Destroy(o);
            owned.Clear(); owned.Add(impact); Build();
        }
        private void OnGUI()
        {
            if (player == null) return;
            if (title == null) { title = new GUIStyle(GUI.skin.label) { fontSize = 28, fontStyle = FontStyle.Bold }; normal = new GUIStyle(GUI.skin.label) { fontSize = 15 }; }
            GUI.Box(new Rect(18, 18, 355, 190), GUIContent.none);
            GUI.Label(new Rect(32, 26, 335, 40), "STROKES / COMBAT LAB", title);
            GUI.Label(new Rect(32, 68, 320, 25), "OWAIS     /     " + player.State, normal);
            Bar(new Rect(32, 103, 310, 18), player.Resources.Health / 100, new Color(.9f, .25f, .25f));
            Bar(new Rect(32, 131, 310, 12), player.Resources.Stamina / 100, Color.cyan);
            GUI.Label(new Rect(32, 158, 320, 40), "Sentinels: " + Remaining() + "    Hits: " + hits, normal);
            GUI.Label(new Rect(22, Screen.height - 55, 900, 48), "WASD move  /  Mouse aim  /  LMB or J combo  /  RMB or K heavy\nSpace dodge  /  R restart  /  Esc pause", normal);
            foreach (var enemy in enemies)
            {
                if (enemy == null || !enemy.Alive) continue;
                Vector3 p = view.WorldToScreenPoint(enemy.transform.position + Vector3.up * 2.6f);
                if (p.z > 0) { Bar(new Rect(p.x - 40, Screen.height - p.y, 80, 7), enemy.Resources.Health / 100, Color.red);
                    GUI.Label(new Rect(p.x - 45, Screen.height - p.y - 22, 120, 22), enemy.State); }
            }
            string message = paused ? "PAUSED" : !player.Alive ? "OWAIS DOWN / R TO RETRY" : Remaining() == 0 ? "ARENA CLEARED / R TO REPLAY" : "";
            GUI.Label(new Rect(Screen.width / 2 - 220, 30, 600, 50), message, title);
#if !ENABLE_LEGACY_INPUT_MANAGER
            GUI.Box(new Rect(20, 220, 640, 65), "Enable Input Manager (Old) or Both in Player > Active Input Handling.\nRestart Unity after changing it. Keyboard controls are currently disabled.");
#endif
        }
        private static void Bar(Rect rect, float value, Color color)
        {
            Color old = GUI.color; GUI.color = new Color(.15f, .16f, .18f); GUI.DrawTexture(rect, Texture2D.whiteTexture);
            rect.width *= Mathf.Clamp01(value); GUI.color = color; GUI.DrawTexture(rect, Texture2D.whiteTexture); GUI.color = old;
        }
        private void OnDestroy()
        {
            Time.timeScale = 1;
            foreach (var o in owned) if (o != null) Destroy(o);
        }
    }
}
