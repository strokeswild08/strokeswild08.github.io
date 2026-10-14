using UnrealBuildTool;
public class AbilityForgeEditorTarget : TargetRules
{
    public AbilityForgeEditorTarget(TargetInfo Target) : base(Target)
    {
        Type = TargetType.Editor;
        DefaultBuildSettings = BuildSettingsVersion.V5;
        IncludeOrderVersion = EngineIncludeOrderVersion.Unreal5_5;
        ExtraModuleNames.Add("AbilityForge");
    }
}
