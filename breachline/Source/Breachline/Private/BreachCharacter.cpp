#include "BreachCharacter.h"
#include "BreachWeaponComponent.h"
#include "RangeTarget.h"
#include "Camera/CameraComponent.h"
#include "Components/InputComponent.h"
#include "Components/StaticMeshComponent.h"
#include "DrawDebugHelpers.h"
#include "Engine/DamageEvents.h"
#include "Engine/World.h"
#include "Engine/StaticMesh.h"
#include "EngineUtils.h"
#include "GameFramework/CharacterMovementComponent.h"
#include "GameFramework/Controller.h"
#include "GameFramework/DamageType.h"
#include "Kismet/GameplayStatics.h"
#include "UObject/ConstructorHelpers.h"

ABreachCharacter::ABreachCharacter()
{
    PrimaryActorTick.bCanEverTick = true;
    bUseControllerRotationYaw = true;
    GetCharacterMovement()->MaxWalkSpeed = 350;
    Camera = CreateDefaultSubobject<UCameraComponent>(TEXT("FirstPersonCamera"));
    Camera->SetupAttachment(GetRootComponent());
    Camera->SetRelativeLocation(FVector(0, 0, 64));
    Camera->bUsePawnControlRotation = true;
    Camera->FieldOfView = 85;
    Weapon = CreateDefaultSubobject<UBreachWeaponComponent>(TEXT("Weapon"));
    Receiver = CreateDefaultSubobject<UStaticMeshComponent>(TEXT("Receiver"));
    Receiver->SetupAttachment(Camera);
    Receiver->SetRelativeLocation(FVector(45, 20, -20));
    Receiver->SetRelativeScale3D(FVector(0.50f, 0.08f, 0.11f));
    Receiver->SetCollisionEnabled(ECollisionEnabled::NoCollision);
    static ConstructorHelpers::FObjectFinder<UStaticMesh> Cube(TEXT("/Engine/BasicShapes/Cube.Cube"));
    if (Cube.Succeeded()) Receiver->SetStaticMesh(Cube.Object);
    auto* Barrel = CreateDefaultSubobject<UStaticMeshComponent>(TEXT("Barrel"));
    Barrel->SetupAttachment(Camera);
    Barrel->SetRelativeLocation(FVector(80, 20, -17));
    Barrel->SetRelativeScale3D(FVector(0.35f, 0.035f, 0.035f));
    Barrel->SetCollisionEnabled(ECollisionEnabled::NoCollision);
    if (Cube.Succeeded()) Barrel->SetStaticMesh(Cube.Object);
}

void ABreachCharacter::BeginPlay()
{
    Super::BeginPlay();
    SetActorLocation(FVector(0, 0, 120));
}

void ABreachCharacter::SetupPlayerInputComponent(UInputComponent* Input)
{
    Super::SetupPlayerInputComponent(Input);
    Input->BindAxis(TEXT("Forward"), this, &ABreachCharacter::Forward);
    Input->BindAxis(TEXT("Strafe"), this, &ABreachCharacter::Strafe);
    Input->BindAxis(TEXT("Turn"), this, &ABreachCharacter::Turn);
    Input->BindAxis(TEXT("LookUp"), this, &ABreachCharacter::LookUp);
    Input->BindAction(TEXT("Fire"), IE_Pressed, this, &ABreachCharacter::FirePressed);
    Input->BindAction(TEXT("Fire"), IE_Released, this, &ABreachCharacter::FireReleased);
    Input->BindAction(TEXT("Aim"), IE_Pressed, this, &ABreachCharacter::AimPressed);
    Input->BindAction(TEXT("Aim"), IE_Released, this, &ABreachCharacter::AimReleased);
    Input->BindAction(TEXT("Reload"), IE_Pressed, this, &ABreachCharacter::Reload);
    Input->BindAction(TEXT("Clear"), IE_Pressed, this, &ABreachCharacter::ClearJam);
    Input->BindAction(TEXT("Jam"), IE_Pressed, this, &ABreachCharacter::ForceJam);
    Input->BindAction(TEXT("Reset"), IE_Pressed, this, &ABreachCharacter::ResetRange);
}

void ABreachCharacter::Forward(float Value) { AddMovementInput(GetActorForwardVector(), Value); }
void ABreachCharacter::Strafe(float Value) { AddMovementInput(GetActorRightVector(), Value); }
void ABreachCharacter::Turn(float Value) { AddControllerYawInput(Value); }
void ABreachCharacter::LookUp(float Value) { AddControllerPitchInput(Value); }
void ABreachCharacter::FirePressed() { bTriggerHeld = true; Fire(); }
void ABreachCharacter::FireReleased() { bTriggerHeld = false; }
void ABreachCharacter::AimPressed() { bAiming = true; }
void ABreachCharacter::AimReleased() { bAiming = false; }
void ABreachCharacter::Reload() { bTriggerHeld = false; Weapon->Reload(); }
void ABreachCharacter::ClearJam() { bTriggerHeld = false; Weapon->ClearJam(); }
void ABreachCharacter::ForceJam() { bTriggerHeld = false; Weapon->ForceJam(); }

void ABreachCharacter::Tick(float DeltaTime)
{
    Super::Tick(DeltaTime);
    if (bTriggerHeld) Fire();
    HitFeedback = FMath::Max(0.0f, HitFeedback - DeltaTime);
    Kick = FMath::FInterpTo(Kick, 0, DeltaTime, 14);
    Camera->SetFieldOfView(FMath::FInterpTo(Camera->FieldOfView, bAiming ? 58.0f : 85.0f, DeltaTime, 12));
    Receiver->SetRelativeLocation(FVector(45 - Kick, bAiming ? 3.0f : 20.0f, -20));
}

void ABreachCharacter::Fire()
{
    if (!Weapon->TryFire()) return;
    ++Shots;
    Kick = 7;
    const FVector Start = Camera->GetComponentLocation();
    const FVector Direction = Camera->GetForwardVector();
    const FVector End = Start + Direction * 12000;
    FHitResult Hit;
    FCollisionQueryParams Params(SCENE_QUERY_STAT(BreachlineShot), false, this);
    const bool bHit = GetWorld()->LineTraceSingleByChannel(Hit, Start, End, ECC_Visibility, Params);
    if (bHit && Hit.GetActor())
    {
        UGameplayStatics::ApplyPointDamage(Hit.GetActor(), 1, Direction, Hit,
            GetController(), this, UDamageType::StaticClass());
    }
    DrawDebugLine(GetWorld(), Start + FVector(0, 0, -10), bHit ? Hit.ImpactPoint : End,
        FColor(255, 190, 90), false, 0.07f, 0, 1.5f);
    if (Controller)
    {
        FRotator Rotation = Controller->GetControlRotation();
        Rotation.Pitch = FMath::ClampAngle(Rotation.Pitch + (bAiming ? 0.35f : 0.8f), -80.0f, 80.0f);
        Controller->SetControlRotation(Rotation);
    }
}

void ABreachCharacter::RegisterHit() { ++Hits; HitFeedback = 0.18f; }

void ABreachCharacter::ResetRange()
{
    bTriggerHeld = false;
    bAiming = false;
    Shots = Hits = 0;
    HitFeedback = Kick = 0;
    Weapon->ResetWeapon();
    SetActorLocation(FVector(0, 0, 120));
    GetCharacterMovement()->StopMovementImmediately();
    if (Controller) Controller->SetControlRotation(FRotator::ZeroRotator);
    for (TActorIterator<ARangeTarget> It(GetWorld()); It; ++It) It->ResetTarget();
}
