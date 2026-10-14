#pragma once
#include "CoreMinimal.h"
#include "Components/ActorComponent.h"
#include "ForgeRules.h"
#include "ForgeTypes.h"
#include "ForgeAbilityComponent.generated.h"
class AForgeProjectile;
class UForgeEffectsComponent;
UCLASS(ClassGroup=(WildStrokes), meta=(BlueprintSpawnableComponent))
class ABILITYFORGE_API UForgeAbilityComponent : public UActorComponent
{
    GENERATED_BODY()
public:
    UForgeAbilityComponent();
    UFUNCTION(BlueprintCallable, Category="Abilities") bool Cast(EForgeAbility Kind);
    UFUNCTION(BlueprintPure, Category="Abilities") float Remaining(EForgeAbility Kind) const;
    UFUNCTION(BlueprintCallable, Category="Abilities") void ResetAbilities();
    UFUNCTION(BlueprintPure, Category="Abilities") bool IsDashing() const { return DashTime > 0; }
    UFUNCTION(BlueprintCallable, Category="Abilities") void Impact(const FHitResult& Hit);
    UPROPERTY(VisibleAnywhere, BlueprintReadOnly, Category="Abilities") FString Feedback = TEXT("Ready. Aim at a target.");
    UPROPERTY(VisibleAnywhere, BlueprintReadOnly, Category="Abilities") int32 CastCount = 0;
    virtual void TickComponent(float Delta, ELevelTick Tick, FActorComponentTickFunction* Function) override;
    virtual void EndPlay(const EEndPlayReason::Type Reason) override;
private:
    ForgeRules::Cooldowns Cooldowns;
    TArray<TWeakObjectPtr<AForgeProjectile>> Projectiles;
    FVector DashDirection = FVector::ZeroVector;
    float DashTime = 0;
    float TrailClock = 0;
    UForgeEffectsComponent* Effects() const;
    void GetAim(FVector& Start, FVector& End) const;
    EForgeFX SurfaceEffect(const FHitResult& Hit) const;
};
