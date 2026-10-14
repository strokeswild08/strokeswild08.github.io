#pragma once
#include "CoreMinimal.h"
#include "GameFramework/Actor.h"
#include "ForgeBeam.generated.h"
class UInstancedStaticMeshComponent;
UCLASS()
class ABILITYFORGE_API AForgeBeam : public AActor
{
    GENERATED_BODY()
public:
    AForgeBeam();
    void Initialize(FVector Start, FVector End);
private:
    UPROPERTY() TObjectPtr<UInstancedStaticMeshComponent> Segments;
};
