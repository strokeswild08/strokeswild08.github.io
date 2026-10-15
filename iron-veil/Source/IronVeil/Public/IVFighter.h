#pragma once
#include "CoreMinimal.h"
#include "GameFramework/Character.h"
#include "CombatCore.h"
#include "IVFighter.generated.h"

class USpringArmComponent;
class UCameraComponent;
class UStaticMeshComponent;

UCLASS(Blueprintable)
class IRONVEIL_API AIVFighter : public ACharacter
{
    GENERATED_BODY()
public:
    AIVFighter();
    virtual void Tick(float DeltaSeconds) override;
    virtual void SetupPlayerInputComponent(UInputComponent* Input) override;
    virtual float TakeDamage(float Amount, const FDamageEvent& Event, AController* Instigator, AActor* Causer) override;
    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category="Combat") bool bEnemy = false;
    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category="Combat") float AttackReach = 190.f;
    UPROPERTY(VisibleAnywhere, BlueprintReadOnly, Category="Visual") TObjectPtr<UStaticMeshComponent> Body;
    UPROPERTY(VisibleAnywhere, BlueprintReadOnly, Category="Visual") TObjectPtr<UStaticMeshComponent> Head;
    UPROPERTY(VisibleAnywhere, BlueprintReadOnly, Category="Visual") TObjectPtr<UStaticMeshComponent> Blade;
    UPROPERTY(VisibleAnywhere, BlueprintReadOnly, Category="Camera") TObjectPtr<USpringArmComponent> Boom;
    UPROPERTY(VisibleAnywhere, BlueprintReadOnly, Category="Camera") TObjectPtr<UCameraComponent> Camera;
    UPROPERTY(BlueprintReadOnly, Category="Debug") bool bShowDebug = false;
    UPROPERTY(BlueprintReadOnly, Category="Debug") FString Intent = TEXT("READY");
    UFUNCTION(BlueprintPure, Category="Combat") float GetHealth() const { return Combat.health; }
    UFUNCTION(BlueprintPure, Category="Combat") float GetStamina() const { return Combat.stamina; }
    UFUNCTION(BlueprintPure, Category="Combat") bool IsAlive() const { return Combat.Alive(); }
    UFUNCTION(BlueprintCallable, Category="Combat") void Attack();
    UFUNCTION(BlueprintCallable, Category="Combat") void Dodge();
    AIVFighter* GetLockTarget() const { return LockTarget.Get(); }
    const iron::Combat& GetCombat() const { return Combat; }
    bool CanSee(const AIVFighter* Other) const;
protected:
    virtual void BeginPlay() override;
private:
    iron::Combat Combat;
    TWeakObjectPtr<AIVFighter> LockTarget;
    FVector DodgeDirection = FVector::ForwardVector;
    float EnemyCooldown = 1.f;
    float FlashTime = 0.f;
    void MoveForward(float Value);
    void MoveRight(float Value);
    void LookYaw(float Value);
    void LookPitch(float Value);
    void ToggleLock();
    void Restart();
    void ToggleDebug();
    void ResolveStrike();
    void TickEnemy(float Dt);
    void UpdateVisuals(float Dt);
};
