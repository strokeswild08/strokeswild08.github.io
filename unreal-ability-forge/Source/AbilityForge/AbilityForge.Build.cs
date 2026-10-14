using UnrealBuildTool;
public class AbilityForge : ModuleRules
{
    public AbilityForge(ReadOnlyTargetRules Target) : base(Target)
    {
        PCHUsage = PCHUsageMode.UseExplicitOrSharedPCHs;
        PublicDependencyModuleNames.AddRange(new string[] { "Core", "CoreUObject", "Engine", "InputCore", "Niagara", "PhysicsCore" });
    }
}
