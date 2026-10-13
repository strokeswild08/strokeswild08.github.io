#pragma once
#include "CoreMinimal.h"
#include "Components/ActorComponent.h"
#include "Engine/EngineTypes.h"
#include "WSImpactComponent.generated.h"

class UNiagaraComponent;
class UNiagaraSystem;

UENUM(BlueprintType)
enum class EWSImpactKind : uint8
{
    Metal,
    Concrete,
    Glass,
    Smoke
};

USTRUCT(BlueprintType)
struct WILDSTROKESIMPACT_API FWSImpactStyle
{
    GENERATED_BODY()

    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category="Impact")
    TObjectPtr<UNiagaraSystem> System = nullptr;

    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category="Impact")
    FLinearColor Tint = FLinearColor::White;
};

// Cosmetic/local component; caller is responsible for multiplayer delivery.
UCLASS(ClassGroup=(Effects), meta=(BlueprintSpawnableComponent))
class WILDSTROKESIMPACT_API UWSImpactComponent : public UActorComponent
{
    GENERATED_BODY()
public:
    UWSImpactComponent();

    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category="Impact|Styles")
    FWSImpactStyle Metal;
    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category="Impact|Styles")
    FWSImpactStyle Concrete;
    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category="Impact|Styles")
    FWSImpactStyle Glass;
    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category="Impact|Styles")
    FWSImpactStyle Smoke;

    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category="Impact|Surfaces")
    TMap<TEnumAsByte<EPhysicalSurface>, EWSImpactKind> SurfaceKinds;

    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category="Impact|Budget", meta=(ClampMin="0.0", ClampMax="5.0"))
    float MinSpawnInterval = 0.05f;
    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category="Impact|Budget", meta=(ClampMin="1", ClampMax="32"))
    int32 MaxActiveEffects = 8;

    UFUNCTION(BlueprintCallable, Category="Wild Strokes|Impact")
    UNiagaraComponent* SpawnImpact(EWSImpactKind Kind, FVector Location, FVector SurfaceNormal, float Intensity = 1.0f, float Size = 1.0f);

    // Set bReturnPhysicalMaterial on the caller's collision trace.
    UFUNCTION(BlueprintCallable, Category="Wild Strokes|Impact")
    UNiagaraComponent* SpawnFromHit(const FHitResult& Hit, float Intensity = 1.0f, float Size = 1.0f);

    UFUNCTION(BlueprintCallable, Category="Wild Strokes|Impact")
    void ClearEffects();

protected:
    virtual void EndPlay(const EEndPlayReason::Type EndPlayReason) override;

private:
    const FWSImpactStyle* GetStyle(EWSImpactKind Kind) const;
    TArray<TWeakObjectPtr<UNiagaraComponent>> ActiveEffects;
    double LastSpawnTime = -1000000.0;
};
