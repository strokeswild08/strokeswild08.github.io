#pragma once
#include "CoreMinimal.h"
#include "GameFramework/Character.h"
#include "ForgeCharacter.generated.h"
class USpringArmComponent;
class UCameraComponent;
class UStaticMeshComponent;
class UForgeAbilityComponent;
class UForgeEffectsComponent;
UCLASS()
class ABILITYFORGE_API AForgeCharacter : public ACharacter
{
    GENERATED_BODY()
public:
    AForgeCharacter();
    virtual void BeginPlay() override;
    virtual void SetupPlayerInputComponent(UInputComponent* Input) override;
    UPROPERTY(VisibleAnywhere, BlueprintReadOnly, Category="Abilities") TObjectPtr<UForgeAbilityComponent> Abilities;
    UPROPERTY(VisibleAnywhere, BlueprintReadOnly, Category="Effects") TObjectPtr<UForgeEffectsComponent> Effects;
private:
    UPROPERTY() TObjectPtr<USpringArmComponent> Boom;
    UPROPERTY() TObjectPtr<UCameraComponent> Camera;
    UPROPERTY() TObjectPtr<UStaticMeshComponent> Body;
    void Forward(float Value);
    void Right(float Value);
    void Turn(float Value);
    void Look(float Value);
    void Fireball();
    void Lightning();
    void Dash();
    void ResetArena();
};
