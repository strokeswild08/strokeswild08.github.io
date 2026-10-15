#pragma once
#include "CoreMinimal.h"
#include "GameFramework/Character.h"
#include "BreachCharacter.generated.h"

UCLASS()
class BREACHLINE_API ABreachCharacter : public ACharacter
{
    GENERATED_BODY()
public:
    ABreachCharacter();
    virtual void BeginPlay() override;
    virtual void Tick(float DeltaTime) override;
    virtual void SetupPlayerInputComponent(UInputComponent* Input) override;
    UPROPERTY(VisibleAnywhere, BlueprintReadOnly) class UCameraComponent* Camera;
    UPROPERTY(VisibleAnywhere, BlueprintReadOnly) class UBreachWeaponComponent* Weapon;
    int32 Shots = 0;
    int32 Hits = 0;
    float HitFeedback = 0;
    void RegisterHit();
private:
    UPROPERTY() class UStaticMeshComponent* Receiver;
    bool bTriggerHeld = false;
    bool bAiming = false;
    float Kick = 0;
    void Forward(float Value);
    void Strafe(float Value);
    void LookUp(float Value);
    void Turn(float Value);
    void FirePressed();
    void FireReleased();
    void AimPressed();
    void AimReleased();
    void Reload();
    void ClearJam();
    void ForceJam();
    void ResetRange();
    void Fire();
};
