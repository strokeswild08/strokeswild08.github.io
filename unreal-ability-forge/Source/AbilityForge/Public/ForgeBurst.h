#pragma once
#include "CoreMinimal.h"
#include "GameFramework/Actor.h"
#include "ForgeTypes.h"
#include "ForgeBurst.generated.h"
class UInstancedStaticMeshComponent;
class UPointLightComponent;
UCLASS()
class ABILITYFORGE_API AForgeBurst : public AActor
{
    GENERATED_BODY()
public:
    AForgeBurst();
    void Initialize(EForgeFX Kind, const FLinearColor& Color, const FVector& Normal);
    virtual void Tick(float Delta) override;
private:
    UPROPERTY() TObjectPtr<UInstancedStaticMeshComponent> Pieces;
    UPROPERTY() TObjectPtr<UPointLightComponent> Light;
    struct FPiece { FVector Position; FVector Velocity; float Scale; };
    TArray<FPiece> Particles;
    float Age = 0;
    float Lifetime = 0.65f;
};
