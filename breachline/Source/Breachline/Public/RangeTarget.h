#pragma once
#include "CoreMinimal.h"
#include "GameFramework/Actor.h"
#include "RangeTarget.generated.h"

UCLASS()
class BREACHLINE_API ARangeTarget : public AActor
{
    GENERATED_BODY()
public:
    ARangeTarget();
    virtual float TakeDamage(float Damage, struct FDamageEvent const& Event,
        AController* InstigatorController, AActor* Causer) override;
    void ResetTarget();
    void SetNumber(int32 Number);
private:
    UPROPERTY() class UStaticMeshComponent* Plate;
    UPROPERTY() class UTextRenderComponent* Label;
    FTimerHandle ResetTimer;
    bool bDown = false;
};
