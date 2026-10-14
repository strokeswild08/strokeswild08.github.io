#include "ForgeVisuals.h"
#include "ForgeProjectile.h"
#include "ForgeAbilityComponent.h"
#include "ForgeRules.h"
#include "ForgeTarget.h"
#include "Components/SphereComponent.h"
#include "Components/StaticMeshComponent.h"
#include "Engine/StaticMesh.h"
#include "Engine/World.h"
#include "EngineUtils.h"
#include "GameFramework/ProjectileMovementComponent.h"
#include "GameFramework/Pawn.h"
#include "GameFramework/DamageType.h"
#include "Kismet/GameplayStatics.h"
#include "Materials/MaterialInstanceDynamic.h"
#include "UObject/ConstructorHelpers.h"
AForgeProjectile::AForgeProjectile()
{
    Collision = CreateDefaultSubobject<USphereComponent>(TEXT("Collision"));
    Collision->InitSphereRadius(14);
    Collision->SetCollisionProfileName(TEXT("BlockAllDynamic"));
    Collision->SetNotifyRigidBodyCollision(true);
    Collision->OnComponentHit.AddDynamic(this, &AForgeProjectile::OnHit);
    SetRootComponent(Collision);
    Visual = CreateDefaultSubobject<UStaticMeshComponent>(TEXT("FireballVisual"));
    Visual->SetupAttachment(Collision);
    Visual->SetCollisionEnabled(ECollisionEnabled::NoCollision);
    Visual->SetRelativeScale3D(FVector(0.25f));
    static ConstructorHelpers::FObjectFinder<UStaticMesh> Sphere(TEXT("/Engine/BasicShapes/Sphere.Sphere"));
    if (Sphere.Succeeded()) Visual->SetStaticMesh(Sphere.Object);
    Movement = CreateDefaultSubobject<UProjectileMovementComponent>(TEXT("ProjectileMovement"));
    Movement->SetUpdatedComponent(Collision);
    Movement->InitialSpeed = 1600;
    Movement->MaxSpeed = 1600;
    Movement->ProjectileGravityScale = 0;
    Movement->bRotationFollowsVelocity = true;
    Movement->bShouldBounce = false;
    Movement->bForceSubStepping = true;
    SetLifeSpan(3.f);
}
void AForgeProjectile::Launch(FVector Direction, UForgeAbilityComponent* Source)
{
    Ability = Source;
    if (Source) Collision->IgnoreActorWhenMoving(Source->GetOwner(), true);
    Movement->Velocity = Direction.GetSafeNormal() * 1600;
    ForgeVisuals::Tint(Visual, FLinearColor(1,0.3f,0.03f), true);
}
void AForgeProjectile::OnHit(UPrimitiveComponent* HitComponent, AActor* Other, UPrimitiveComponent* OtherComponent, FVector Impulse, const FHitResult& Hit)
{
    if (Exploded || Other == GetOwner()) return;
    Exploded = true;
    if (Ability.IsValid()) Ability->Impact(Hit);
    const FVector Center = Hit.ImpactPoint + Hit.ImpactNormal * 5;
    APawn* Pawn = Cast<APawn>(GetOwner());
    for (TActorIterator<AForgeTarget> It(GetWorld()); It; ++It)
    {
        const float Amount = static_cast<float>(ForgeRules::BlastDamage(FVector::Distance(Center, It->GetActorLocation()), 260, 60));
        if (Amount <= 0 || It->Health <= 0) continue;
        FHitResult Occlusion;
        FCollisionQueryParams Params(SCENE_QUERY_STAT(ForgeBlast), false, this);
        Params.AddIgnoredActor(GetOwner());
        const bool Blocked = GetWorld()->LineTraceSingleByChannel(Occlusion, Center, It->GetActorLocation(), ECC_Visibility, Params);
        if (!Blocked || Occlusion.GetActor() == *It) UGameplayStatics::ApplyDamage(*It, Amount, Pawn ? Pawn->GetController() : nullptr, this, UDamageType::StaticClass());
    }
    Destroy();
}
