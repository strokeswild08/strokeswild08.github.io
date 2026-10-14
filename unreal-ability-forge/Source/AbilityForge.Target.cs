using UnrealBuildTool;
public class AbilityForgeTarget : TargetRules
{
    public AbilityForgeTarget(TargetInfo Target) : base(Target)
    {
        Type = TargetType.Game;
        DefaultBuildSettings = BuildSettingsVersion.V5;
        IncludeOrderVersion = EngineIncludeOrderVersion.Unreal5_5;
        ExtraModuleNames.Add("AbilityForge");
    }
}
