#include "ForgeVisuals.h"
#include "ForgeTarget.h"
#include "Components/StaticMeshComponent.h"
#include "Components/TextRenderComponent.h"
#include "Engine/StaticMesh.h"
#include "Engine/World.h"
#include "Materials/MaterialInstanceDynamic.h"
#include "PhysicalMaterials/PhysicalMaterial.h"
#include "TimerManager.h"
#include "UObject/ConstructorHelpers.h"

AForgeTarget::AForgeTarget()
{
    Body = CreateDefaultSubobject<UStaticMeshComponent>(TEXT("TargetBody"));
    SetRootComponent(Body);
    Body->SetMobility(EComponentMobility::Movable);
    Body->SetCollisionProfileName(TEXT("BlockAllDynamic"));
    static ConstructorHelpers::FObjectFinder<UStaticMesh> Cube(TEXT("/Engine/BasicShapes/Cube.Cube"));
    if (Cube.Succeeded()) Body->SetStaticMesh(Cube.Object);
    Body->SetRelativeScale3D(FVector(0.8f,0.8f,1.4f));
    Label = CreateDefaultSubobject<UTextRenderComponent>(TEXT("HealthLabel"));
    Label->SetupAttachment(Body);
    Label->SetRelativeLocation(FVector(-55,0,100));
    Label->SetRelativeRotation(FRotator(0,180,0));
    Label->SetWorldSize(18);
    Label->SetHorizontalAlignment(EHTA_Center);
}
void AForgeTarget::Configure(int32 Surface)
{
    SurfaceId = Surface;
    PhysicalMaterial = NewObject<UPhysicalMaterial>(this);
    PhysicalMaterial->SurfaceType = static_cast<EPhysicalSurface>(Surface);
    Body->SetPhysMaterialOverride(PhysicalMaterial);
    const FLinearColor Color = Surface == 1 ? FLinearColor(1,0.62f,0.15f) : (Surface == 3 ? FLinearColor(0.25f,0.85f,1) : FLinearColor(0.55f,0.55f,0.5f));
    ForgeVisuals::Tint(Body, Color);
    Label->SetTextRenderColor(Color.ToFColor(true));
    UpdateLabel();
}
void AForgeTarget::UpdateLabel()
{
    const FString Name = SurfaceId == 1 ? TEXT("METAL") : (SurfaceId == 3 ? TEXT("GLASS") : TEXT("STONE"));
    Label->SetText(FText::FromString(FString::Printf(TEXT("%s / %.0f HP"), *Name, Health)));
}
float AForgeTarget::TakeDamage(float Amount, const FDamageEvent& Event, AController* Instigator, AActor* Causer)
{
    if (!FMath::IsFinite(Amount) || Amount <= 0 || Health <= 0) return 0;
    const float Applied = FMath::Min(Amount, Health);
    Super::TakeDamage(Applied, Event, Instigator, Causer);
    Health -= Applied;
    UpdateLabel();
    if (Health <= 0)
    {
        Body->SetVisibility(false); Body->SetCollisionEnabled(ECollisionEnabled::NoCollision);
        GetWorldTimerManager().SetTimer(RespawnTimer, this, &AForgeTarget::ResetTarget, 3.f, false);
    }
    return Applied;
}
void AForgeTarget::ResetTarget()
{
    GetWorldTimerManager().ClearTimer(RespawnTimer);
    Health = 100;
    Body->SetVisibility(true); Body->SetCollisionEnabled(ECollisionEnabled::QueryAndPhysics);
    UpdateLabel();
}
