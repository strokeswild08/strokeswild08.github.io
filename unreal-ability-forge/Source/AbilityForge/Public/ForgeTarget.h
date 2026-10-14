#pragma once
#include "CoreMinimal.h"
#include "GameFramework/Actor.h"
#include "ForgeTarget.generated.h"
class UStaticMeshComponent;
class UTextRenderComponent;
class UPhysicalMaterial;
UCLASS()
class ABILITYFORGE_API AForgeTarget : public AActor
{
    GENERATED_BODY()
public:
    AForgeTarget();
    virtual float TakeDamage(float Amount, const FDamageEvent& Event, AController* Instigator, AActor* Causer) override;
    void Configure(int32 Surface);
    void ResetTarget();
    UPROPERTY(VisibleAnywhere, BlueprintReadOnly, Category="Target") float Health = 100.f;
    int32 SurfaceId = 2;
private:
    UPROPERTY() TObjectPtr<UStaticMeshComponent> Body;
    UPROPERTY() TObjectPtr<UTextRenderComponent> Label;
    UPROPERTY() TObjectPtr<UPhysicalMaterial> PhysicalMaterial;
    FTimerHandle RespawnTimer;
    void UpdateLabel();
};
