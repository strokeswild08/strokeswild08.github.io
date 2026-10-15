#include "BreachWeaponComponent.h"

UBreachWeaponComponent::UBreachWeaponComponent()
{
    PrimaryComponentTick.bCanEverTick = true;
}

void UBreachWeaponComponent::BeginPlay()
{
    Super::BeginPlay();
    Random.GenerateNewSeed();
    ResetWeapon();
}

void UBreachWeaponComponent::ResetWeapon()
{
    Breachline::Settings Settings;
    Settings.JamProbability = JamChance;
    Core = Breachline::Weapon(Settings);
    OnStateChanged.Broadcast();
}

void UBreachWeaponComponent::TickComponent(float DeltaTime, ELevelTick TickType,
    FActorComponentTickFunction* ThisTickFunction)
{
    Super::TickComponent(DeltaTime, TickType, ThisTickFunction);
    const auto Before = Core.GetPhase();
    Core.Advance(DeltaTime);
    if (Before != Core.GetPhase()) OnStateChanged.Broadcast();
}

bool UBreachWeaponComponent::TryFire()
{
    const auto Before = Core.GetPhase();
    const auto Result = Core.TryFire(Random.GetFraction());
    if (Before != Core.GetPhase()) OnStateChanged.Broadcast();
    if (Result != Breachline::Shot::Fired) return false;
    OnFired.Broadcast();
    return true;
}

bool UBreachWeaponComponent::Reload()
{
    if (!Core.Reload()) return false;
    OnStateChanged.Broadcast();
    return true;
}

bool UBreachWeaponComponent::ClearJam()
{
    if (!Core.Clear()) return false;
    OnStateChanged.Broadcast();
    return true;
}

bool UBreachWeaponComponent::ForceJam()
{
    if (!Core.ForceJam()) return false;
    OnStateChanged.Broadcast();
    return true;
}

FString UBreachWeaponComponent::StateLabel() const
{
    switch (Core.GetPhase())
    {
    case Breachline::Phase::Reloading: return TEXT("RELOADING");
    case Breachline::Phase::Jammed: return TEXT("JAMMED - PRESS F");
    case Breachline::Phase::Clearing: return TEXT("CLEARING");
    default: return Core.GetMagazine() == 0 ? TEXT("EMPTY - PRESS R") : TEXT("READY");
    }
}
