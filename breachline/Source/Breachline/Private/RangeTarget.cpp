#include "RangeTarget.h"
#include "BreachCharacter.h"
#include "Components/StaticMeshComponent.h"
#include "Components/TextRenderComponent.h"
#include "Engine/World.h"
#include "Engine/StaticMesh.h"
#include "TimerManager.h"
#include "UObject/ConstructorHelpers.h"

ARangeTarget::ARangeTarget()
{
    Plate = CreateDefaultSubobject<UStaticMeshComponent>(TEXT("TargetPlate"));
    SetRootComponent(Plate);
    static ConstructorHelpers::FObjectFinder<UStaticMesh> Cube(TEXT("/Engine/BasicShapes/Cube.Cube"));
    if (Cube.Succeeded()) Plate->SetStaticMesh(Cube.Object);
    Plate->SetRelativeScale3D(FVector(0.14f, 0.8f, 1.3f));
    Plate->SetCollisionProfileName(TEXT("BlockAll"));
    Label = CreateDefaultSubobject<UTextRenderComponent>(TEXT("Number"));
    Label->SetupAttachment(Plate);
    Label->SetAbsolute(false, false, true);
    Label->SetRelativeLocation(FVector(-55, 0, 0));
    Label->SetRelativeRotation(FRotator(0, 180, 0));
    Label->SetHorizontalAlignment(EHTA_Center);
    Label->SetWorldSize(30);
    Label->SetTextRenderColor(FColor(240, 157, 77));
}

void ARangeTarget::SetNumber(int32 Number)
{
    Label->SetText(FText::FromString(FString::Printf(TEXT("%02d"), Number)));
}

float ARangeTarget::TakeDamage(float Damage, FDamageEvent const& Event,
    AController* InstigatorController, AActor* Causer)
{
    if (Damage <= 0 || bDown) return 0;
    bDown = true;
    Plate->SetVisibility(false);
    Label->SetVisibility(false);
    Plate->SetCollisionEnabled(ECollisionEnabled::NoCollision);
    if (auto* Shooter = Cast<ABreachCharacter>(Causer)) Shooter->RegisterHit();
    GetWorldTimerManager().SetTimer(ResetTimer, this, &ARangeTarget::ResetTarget, 2.0f, false);
    return Damage;
}

void ARangeTarget::ResetTarget()
{
    GetWorldTimerManager().ClearTimer(ResetTimer);
    bDown = false;
    Plate->SetVisibility(true);
    Label->SetVisibility(true);
    Plate->SetCollisionEnabled(ECollisionEnabled::QueryAndPhysics);
}
