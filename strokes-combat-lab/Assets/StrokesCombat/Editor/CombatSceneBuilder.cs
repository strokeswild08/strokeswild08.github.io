using UnityEditor;
using UnityEditor.SceneManagement;
using UnityEngine;
namespace Strokes.Combat.Editor
{
    public static class CombatSceneBuilder
    {
        [MenuItem("Strokes/Combat Lab/Create Demo Scene")]
        public static void Create()
        {
            if (!EditorSceneManager.SaveCurrentModifiedScenesIfUserWantsTo()) return;
            var scene = EditorSceneManager.NewScene(NewSceneSetup.EmptyScene, NewSceneMode.Single);
            new GameObject("Strokes Combat Demo").AddComponent<CombatDemo>();
            System.IO.Directory.CreateDirectory("Assets/StrokesCombat/Scenes");
            EditorSceneManager.SaveScene(scene, "Assets/StrokesCombat/Scenes/CombatLab.unity");
            Selection.activeGameObject = Object.FindObjectOfType<CombatDemo>().gameObject;
            Debug.Log("Combat Lab created. Enable legacy input or Both, then press Play.");
        }
    }
}
