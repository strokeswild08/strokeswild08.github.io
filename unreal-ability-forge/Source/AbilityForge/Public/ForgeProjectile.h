#pragma once
#include "CoreMinimal.h"
#include "GameFramework/Actor.h"
#include "ForgeProjectile.generated.h"
class USphereComponent;
class UStaticMeshComponent;
class UProjectileMovementComponent;
class UForgeAbilityComponent;
UCLASS()
class ABILITYFORGE_API AForgeProjectile : public AActor
{
    GENERATED_BODY()
public:
    AForgeProjectile();
    void Launch(FVector Direction, UForgeAbilityComponent* Source);
    UFUNCTION() void OnHit(UPrimitiveComponent* HitComponent, AActor* Other, UPrimitiveComponent* OtherComponent, FVector Impulse, const FHitResult& Hit);
private:
    UPROPERTY() TObjectPtr<USphereComponent> Collision;
    UPROPERTY() TObjectPtr<UStaticMeshComponent> Visual;
    UPROPERTY() TObjectPtr<UProjectileMovementComponent> Movement;
    TWeakObjectPtr<UForgeAbilityComponent> Ability;
    bool Exploded = false;
};
