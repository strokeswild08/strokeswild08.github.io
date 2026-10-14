#pragma once
#include "CoreMinimal.h"
#include "Components/ActorComponent.h"
#include "ForgeTypes.h"
#include "ForgeEffectsComponent.generated.h"
class UNiagaraSystem;
class UNiagaraComponent;
class AForgeBurst;
USTRUCT(BlueprintType)
struct FForgeEffectSlot
{
    GENERATED_BODY()
    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category="Effect") TObjectPtr<UNiagaraSystem> System;
    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category="Effect") FLinearColor Tint = FLinearColor::White;
};
UCLASS(ClassGroup=(WildStrokes), meta=(BlueprintSpawnableComponent))
class ABILITYFORGE_API UForgeEffectsComponent : public UActorComponent
{
    GENERATED_BODY()
public:
    UForgeEffectsComponent();
    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category="Effects") TMap<EForgeFX, FForgeEffectSlot> Slots;
    UFUNCTION(BlueprintCallable, Category="Effects") void Play(EForgeFX Kind, FVector Location, FVector Normal, FVector End);
    UFUNCTION(BlueprintCallable, Category="Effects") void ClearEffects();
    virtual void EndPlay(const EEndPlayReason::Type Reason) override;
private:
    TArray<TWeakObjectPtr<UNiagaraComponent>> ActiveNiagara;
    TArray<TWeakObjectPtr<AForgeBurst>> ActiveBursts;
};
