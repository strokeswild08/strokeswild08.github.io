#pragma once

#include "CoreMinimal.h"
#include "Components/ActorComponent.h"
#include "WeaponCore.h"
#include "BreachWeaponComponent.generated.h"

DECLARE_DYNAMIC_MULTICAST_DELEGATE(FBreachWeaponEvent);

UCLASS(ClassGroup=(Breachline), meta=(BlueprintSpawnableComponent))
class BREACHLINE_API UBreachWeaponComponent : public UActorComponent
{
    GENERATED_BODY()
public:
    UBreachWeaponComponent();
    virtual void BeginPlay() override;
    virtual void TickComponent(float DeltaTime, ELevelTick TickType,
        FActorComponentTickFunction* ThisTickFunction) override;

    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category="Weapon", meta=(ClampMin="0", ClampMax="1"))
    float JamChance = 0.06f;
    UPROPERTY(BlueprintAssignable, Category="Weapon") FBreachWeaponEvent OnFired;
    UPROPERTY(BlueprintAssignable, Category="Weapon") FBreachWeaponEvent OnStateChanged;

    UFUNCTION(BlueprintCallable, Category="Weapon") bool TryFire();
    UFUNCTION(BlueprintCallable, Category="Weapon") bool Reload();
    UFUNCTION(BlueprintCallable, Category="Weapon") bool ClearJam();
    UFUNCTION(BlueprintCallable, Category="Weapon") bool ForceJam();
    UFUNCTION(BlueprintCallable, Category="Weapon") void ResetWeapon();
    UFUNCTION(BlueprintPure, Category="Weapon") int32 Magazine() const { return Core.GetMagazine(); }
    UFUNCTION(BlueprintPure, Category="Weapon") int32 Reserve() const { return Core.GetReserve(); }
    UFUNCTION(BlueprintPure, Category="Weapon") FString StateLabel() const;
    UFUNCTION(BlueprintPure, Category="Weapon") float ActionProgress() const { return static_cast<float>(Core.GetProgress()); }

private:
    Breachline::Weapon Core;
    FRandomStream Random;
};
