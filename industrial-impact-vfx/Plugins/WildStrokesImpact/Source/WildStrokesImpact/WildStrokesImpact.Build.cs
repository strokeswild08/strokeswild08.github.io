using UnrealBuildTool;
public class WildStrokesImpact : ModuleRules
{
    public WildStrokesImpact(ReadOnlyTargetRules Target) : base(Target)
    {
        PCHUsage = PCHUsageMode.UseExplicitOrSharedPCHs;
        PublicDependencyModuleNames.AddRange(new[] { "Core", "CoreUObject", "Engine", "Niagara", "PhysicsCore" });
    }
}
