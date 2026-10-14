#include "ForgeAbilityComponent.h"
#include "ForgeEffectsComponent.h"
#include "ForgeBeam.h"
#include "ForgeProjectile.h"
#include "ForgeTarget.h"
#include "Engine/World.h"
#include "EngineUtils.h"
#include "GameFramework/Character.h"
#include "GameFramework/CharacterMovementComponent.h"
#include "GameFramework/Controller.h"
#include "GameFramework/DamageType.h"
#include "Kismet/GameplayStatics.h"
#include "PhysicalMaterials/PhysicalMaterial.h"

UForgeAbilityComponent::UForgeAbilityComponent() { PrimaryComponentTick.bCanEverTick = true; }
UForgeEffectsComponent* UForgeAbilityComponent::Effects() const { return GetOwner() ? GetOwner()->FindComponentByClass<UForgeEffectsComponent>() : nullptr; }
float UForgeAbilityComponent::Remaining(EForgeAbility Kind) const
{
    return GetWorld() ? static_cast<float>(Cooldowns.Remaining(static_cast<ForgeRules::Ability>(Kind), GetWorld()->GetTimeSeconds())) : -1.f;
}
void UForgeAbilityComponent::GetAim(FVector& Start, FVector& End) const
{
    const APawn* Pawn = ::Cast<APawn>(GetOwner());
    FRotator Rotation = GetOwner()->GetActorRotation();
    Start = GetOwner()->GetActorLocation() + FVector(0,0,60);
    if (Pawn && Pawn->GetController()) Pawn->GetController()->GetPlayerViewPoint(Start, Rotation);
    End = Start + Rotation.Vector() * 2200;
    FHitResult Hit;
    FCollisionQueryParams Params(SCENE_QUERY_STAT(ForgeAim), false, GetOwner());
    if (GetWorld()->LineTraceSingleByChannel(Hit, Start, End, ECC_Visibility, Params)) End = Hit.ImpactPoint;
}
EForgeFX UForgeAbilityComponent::SurfaceEffect(const FHitResult& Hit) const
{
    int32 Id = static_cast<int32>(UPhysicalMaterial::DetermineSurfaceType(Hit.PhysMaterial.Get()));
    if (const AForgeTarget* Target = ::Cast<AForgeTarget>(Hit.GetActor())) Id = Target->SurfaceId;
    switch (ForgeRules::RouteSurface(Id))
    {
        case ForgeRules::Surface::Metal: return EForgeFX::Metal;
        case ForgeRules::Surface::Glass: return EForgeFX::Glass;
        default: return EForgeFX::Stone;
    }
}
bool UForgeAbilityComponent::Cast(EForgeAbility Kind)
{
    UWorld* World = GetWorld();
    ACharacter* Character = ::Cast<ACharacter>(GetOwner());
    if (!World || !Character || World->GetNetMode() != NM_Standalone)
    {
        Feedback = TEXT("Standalone character required."); return false;
    }
    const auto RuleKind = static_cast<ForgeRules::Ability>(Kind);
    const double Now = World->GetTimeSeconds();
    if (!Cooldowns.CanCast(RuleKind, Now)) { Feedback = TEXT("Ability cooling down."); return false; }
    FVector Start, End;
    GetAim(Start, End);
    if (Kind == EForgeAbility::Fireball)
    {
        Projectiles.RemoveAll([](const TWeakObjectPtr<AForgeProjectile>& Item) { return !Item.IsValid(); });
        if (Projectiles.Num() >= 16) { Feedback = TEXT("Projectile budget reached."); return false; }
        const FVector Origin = Character->GetActorLocation() + FVector(0,0,45) + Character->GetActorForwardVector()*65;
        FHitResult Blocker;
        FCollisionQueryParams SpawnParams(SCENE_QUERY_STAT(ForgeMuzzle), false, Character);
        // Prevent the muzzle from starting on the far side of a nearby wall.
        if (World->LineTraceSingleByChannel(Blocker, Character->GetActorLocation()+FVector(0,0,45), Origin, ECC_Visibility, SpawnParams)) { Feedback = TEXT("Muzzle blocked."); return false; }
        const FVector Direction = (End - Origin).GetSafeNormal();
        FActorSpawnParameters Params;
        Params.Owner = Character; Params.Instigator = Character;
        Params.SpawnCollisionHandlingOverride = ESpawnActorCollisionHandlingMethod::DontSpawnIfColliding;
        AForgeProjectile* Projectile = World->SpawnActor<AForgeProjectile>(Origin, Direction.Rotation(), Params);
        if (!Projectile) { Feedback = TEXT("Not enough room to cast."); return false; }
        Projectile->Launch(Direction, this);
        Projectiles.Add(Projectile);
        if (Effects()) Effects()->Play(EForgeFX::Fireball, Origin, Direction, End);
        Feedback = TEXT("Fireball / 260 cm blast radius");
    }
    else if (Kind == EForgeAbility::Lightning)
    {
        FHitResult Hit;
        FCollisionQueryParams Params(SCENE_QUERY_STAT(ForgeLightning), false, Character);
        Params.bReturnPhysicalMaterial = true;
        const FVector Muzzle = Character->GetActorLocation() + FVector(0,0,45) + Character->GetActorForwardVector()*40;
        FHitResult MuzzleBlocker;
        if (World->LineTraceSingleByChannel(MuzzleBlocker, Character->GetActorLocation()+FVector(0,0,45), Muzzle, ECC_Visibility, Params)) { Feedback = TEXT("Muzzle blocked."); return false; }
        const FVector BeamEnd = Muzzle + (End-Muzzle).GetSafeNormal() * FMath::Min(1600.f, static_cast<float>(FVector::Distance(Muzzle,End)));
        const bool HitSomething = World->LineTraceSingleByChannel(Hit, Muzzle, BeamEnd, ECC_Visibility, Params);
        const FVector Contact = HitSomething ? Hit.ImpactPoint : BeamEnd;
        if (AForgeBeam* Beam = World->SpawnActor<AForgeBeam>(Muzzle, FRotator::ZeroRotator)) Beam->Initialize(Muzzle, Contact);
        if (Effects())
        {
            Effects()->Play(EForgeFX::Lightning, Muzzle, (Contact-Muzzle).GetSafeNormal(), Contact);
            if (HitSomething) Effects()->Play(SurfaceEffect(Hit), Contact, Hit.ImpactNormal, Contact);
        }
        if (HitSomething && ::Cast<AForgeTarget>(Hit.GetActor())) UGameplayStatics::ApplyDamage(Hit.GetActor(), 45.f, Character->GetController(), Character, UDamageType::StaticClass());
        Feedback = HitSomething ? TEXT("Lightning / surface hit") : TEXT("Lightning / missed");
    }
    else if (Kind == EForgeAbility::Dash)
    {
        DashDirection = Character->GetLastMovementInputVector().GetSafeNormal2D();
        if (DashDirection.IsNearlyZero()) DashDirection = Character->GetActorForwardVector().GetSafeNormal2D();
        DashTime = 0.22f; TrailClock = 0;
        Character->ConsumeMovementInputVector();
        Character->GetCharacterMovement()->StopMovementImmediately();
        Feedback = TEXT("Dash / swept movement; no invulnerability");
    }
    else return false;
    Cooldowns.Commit(RuleKind, Now);
    ++CastCount;
    return true;
}
void UForgeAbilityComponent::TickComponent(float Delta, ELevelTick Tick, FActorComponentTickFunction* Function)
{
    Super::TickComponent(Delta, Tick, Function);
    if (DashTime <= 0) return;
    ACharacter* Character = ::Cast<ACharacter>(GetOwner());
    if (!Character) { DashTime = 0; return; }
    const float Step = static_cast<float>(ForgeRules::DashStep(Delta, DashTime));
    FHitResult Hit;
    Character->AddActorWorldOffset(DashDirection * Step, true, &Hit);
    DashTime = FMath::Max(0.f, DashTime-Delta);
    if (Hit.bBlockingHit) DashTime = 0;
    TrailClock -= Delta;
    if (TrailClock <= 0)
    {
        if (Effects()) Effects()->Play(EForgeFX::Dash, Character->GetActorLocation(), -DashDirection, Character->GetActorLocation());
        TrailClock = 0.055f;
    }
}
void UForgeAbilityComponent::Impact(const FHitResult& Hit)
{
    if (Effects())
    {
        Effects()->Play(EForgeFX::Explosion, Hit.ImpactPoint, Hit.ImpactNormal, Hit.ImpactPoint);
        Effects()->Play(SurfaceEffect(Hit), Hit.ImpactPoint, Hit.ImpactNormal, Hit.ImpactPoint);
    }
}
void UForgeAbilityComponent::ResetAbilities()
{
    Cooldowns.Reset(); DashTime = 0; CastCount = 0;
    for (const auto& Projectile : Projectiles) if (Projectile.IsValid()) Projectile->Destroy();
    Projectiles.Empty();
    if (Effects()) Effects()->ClearEffects();
    if (GetWorld()) for (TActorIterator<AForgeTarget> It(GetWorld()); It; ++It) It->ResetTarget();
    Feedback = TEXT("Targets and cooldowns reset.");
}
void UForgeAbilityComponent::EndPlay(const EEndPlayReason::Type Reason)
{
    for (const auto& Projectile : Projectiles) if (Projectile.IsValid()) Projectile->Destroy();
    Projectiles.Empty();
    Super::EndPlay(Reason);
}
