#include "ForgeVisuals.h"
#include "ForgeCharacter.h"
#include "ForgeAbilityComponent.h"
#include "ForgeEffectsComponent.h"
#include "Camera/CameraComponent.h"
#include "Components/CapsuleComponent.h"
#include "Components/InputComponent.h"
#include "Components/StaticMeshComponent.h"
#include "Engine/StaticMesh.h"
#include "GameFramework/CharacterMovementComponent.h"
#include "GameFramework/SpringArmComponent.h"
#include "UObject/ConstructorHelpers.h"

AForgeCharacter::AForgeCharacter()
{
    GetCapsuleComponent()->InitCapsuleSize(34,88);
    GetCharacterMovement()->MaxWalkSpeed = 420;
    GetCharacterMovement()->BrakingDecelerationWalking = 1800;
    bUseControllerRotationYaw = true;
    Boom = CreateDefaultSubobject<USpringArmComponent>(TEXT("CameraBoom"));
    Boom->SetupAttachment(GetRootComponent());
    Boom->TargetArmLength = 380;
    Boom->SocketOffset = FVector(0,65,60);
    Boom->bUsePawnControlRotation = true;
    Camera = CreateDefaultSubobject<UCameraComponent>(TEXT("Camera"));
    Camera->SetupAttachment(Boom);
    Camera->FieldOfView = 85;
    Body = CreateDefaultSubobject<UStaticMeshComponent>(TEXT("PrototypeBody"));
    Body->SetupAttachment(GetRootComponent());
    Body->SetCollisionEnabled(ECollisionEnabled::NoCollision);
    static ConstructorHelpers::FObjectFinder<UStaticMesh> Sphere(TEXT("/Engine/BasicShapes/Sphere.Sphere"));
    if (Sphere.Succeeded()) Body->SetStaticMesh(Sphere.Object);
    Body->SetRelativeScale3D(FVector(0.52f,0.52f,1.45f));
    Body->SetRelativeLocation(FVector(0,0,-10));
    Abilities = CreateDefaultSubobject<UForgeAbilityComponent>(TEXT("Abilities"));
    Effects = CreateDefaultSubobject<UForgeEffectsComponent>(TEXT("Effects"));
}
void AForgeCharacter::SetupPlayerInputComponent(UInputComponent* Input)
{
    Super::SetupPlayerInputComponent(Input);
    Input->BindAxis(TEXT("MoveForward"), this, &AForgeCharacter::Forward);
    Input->BindAxis(TEXT("MoveRight"), this, &AForgeCharacter::Right);
    Input->BindAxis(TEXT("Turn"), this, &AForgeCharacter::Turn);
    Input->BindAxis(TEXT("LookUp"), this, &AForgeCharacter::Look);
    Input->BindAction(TEXT("Fireball"), IE_Pressed, this, &AForgeCharacter::Fireball);
    Input->BindAction(TEXT("Lightning"), IE_Pressed, this, &AForgeCharacter::Lightning);
    Input->BindAction(TEXT("Dash"), IE_Pressed, this, &AForgeCharacter::Dash);
    Input->BindAction(TEXT("Reset"), IE_Pressed, this, &AForgeCharacter::ResetArena);
}
void AForgeCharacter::Forward(float Value) { if (!Abilities->IsDashing()) AddMovementInput(GetActorForwardVector(), Value); }
void AForgeCharacter::Right(float Value) { if (!Abilities->IsDashing()) AddMovementInput(GetActorRightVector(), Value); }
void AForgeCharacter::Turn(float Value) { AddControllerYawInput(Value); }
void AForgeCharacter::Look(float Value) { AddControllerPitchInput(Value); }
void AForgeCharacter::Fireball() { Abilities->Cast(EForgeAbility::Fireball); }
void AForgeCharacter::Lightning() { Abilities->Cast(EForgeAbility::Lightning); }
void AForgeCharacter::Dash() { Abilities->Cast(EForgeAbility::Dash); }
void AForgeCharacter::ResetArena() { Abilities->ResetAbilities(); }

void AForgeCharacter::BeginPlay()
{
    Super::BeginPlay();
    ForgeVisuals::Tint(Body, FLinearColor(0.08f,0.45f,0.4f));
}
