using UnityEditor;
using UnityEditor.SceneManagement;
using UnityEngine;
using System.IO;
public static class SiegeSceneBuilder
{
 [MenuItem("Neon Siege/Create Demo Scene")]
 public static void Create()
 {
  if(!EditorSceneManager.SaveCurrentModifiedScenesIfUserWantsTo()) return;
  var scene=EditorSceneManager.NewScene(NewSceneSetup.EmptyScene,NewSceneMode.Single);
  Directory.CreateDirectory("Assets/Scenes");
  EditorSceneManager.SaveScene(scene,"Assets/Scenes/NeonSiege.unity");
  EditorBuildSettings.scenes=new[]{new EditorBuildSettingsScene("Assets/Scenes/NeonSiege.unity",true)};
  AssetDatabase.Refresh();
  Debug.Log("Neon Siege scene ready. Press Play; runtime bootstrap creates the game.");
 }
}
