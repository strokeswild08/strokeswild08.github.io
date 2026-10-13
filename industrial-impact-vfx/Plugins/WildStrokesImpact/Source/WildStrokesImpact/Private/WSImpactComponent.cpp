#include "WSImpactComponent.h"
#include "WSImpactRules.h"
#include "Engine/World.h"
#include "Math/RotationMatrix.h"
#include "NiagaraComponent.h"
#include "NiagaraFunctionLibrary.h"
#include "NiagaraSystem.h"
#include "PhysicalMaterials/PhysicalMaterial.h"

UWSImpactComponent::UWSImpactComponent()
{
    PrimaryComponentTick.bCanEverTick = false;
    Metal.Tint = FLinearColor(1.0f, 0.55f, 0.12f, 1.0f);
    Concrete.Tint = FLinearColor(0.60f, 0.57f, 0.52f, 1.0f);
    Glass.Tint = FLinearColor(0.25f, 0.85f, 0.80f, 1.0f);
    Smoke.Tint = FLinearColor(0.50f, 0.52f, 0.56f, 1.0f);
}

const FWSImpactStyle* UWSImpactComponent::GetStyle(EWSImpactKind Kind) const
{
    switch (Kind)
    {
        case EWSImpactKind::Metal: return &Metal;
        case EWSImpactKind::Concrete: return &Concrete;
        case EWSImpactKind::Glass: return &Glass;
        case EWSImpactKind::Smoke: return &Smoke;
        default: return nullptr;
    }
}

UNiagaraComponent* UWSImpactComponent::SpawnImpact(EWSImpactKind Kind, FVector Location, FVector SurfaceNormal, float Intensity, float Size)
{
    UWorld* World = GetWorld();
    const FWSImpactStyle* Style = GetStyle(Kind);
    if (!World || World->GetNetMode() == NM_DedicatedServer || !Style || !IsValid(Style->System.Get()) || Location.ContainsNaN() || SurfaceNormal.ContainsNaN()) return nullptr;

    ActiveEffects.RemoveAll([](const TWeakObjectPtr<UNiagaraComponent>& Effect)
    {
        return !Effect.IsValid() || Effect->IsComplete();
    });
    const double Now = World->GetTimeSeconds();
    if (!WSImpactRules::CanSpawn(Now, LastSpawnTime, MinSpawnInterval, ActiveEffects.Num(), FMath::Clamp(MaxActiveEffects, 1, 32))) return nullptr;

    const auto Values = WSImpactRules::Sanitize(Intensity, Size);
    const FVector Normal = SurfaceNormal.IsNearlyZero() ? FVector::UpVector : SurfaceNormal.GetSafeNormal();
    // Delay activation until all user parameters have been set; local +Z points out of the hit surface.
    UNiagaraComponent* Effect = UNiagaraFunctionLibrary::SpawnSystemAtLocation(
        this, Style->System.Get(), Location, FRotationMatrix::MakeFromZ(Normal).Rotator(), FVector::OneVector,
        true, false, ENCPoolMethod::None, false);
    if (!Effect) return nullptr;
    FLinearColor Colour = Style->Tint;
    Colour.R = WSImpactRules::FiniteClamp(Colour.R, 0.0f, 10.0f, 1.0f);
    Colour.G = WSImpactRules::FiniteClamp(Colour.G, 0.0f, 10.0f, 1.0f);
    Colour.B = WSImpactRules::FiniteClamp(Colour.B, 0.0f, 10.0f, 1.0f);
    Colour.A = WSImpactRules::FiniteClamp(Colour.A, 0.0f, 1.0f, 1.0f);
    Effect->SetVariableVec3(FName(TEXT("User.Normal")), Normal);
    Effect->SetVariableFloat(FName(TEXT("User.Intensity")), Values.Intensity);
    Effect->SetVariableFloat(FName(TEXT("User.Size")), Values.Size);
    Effect->SetVariableLinearColor(FName(TEXT("User.Color")), Colour);
    Effect->Activate(true);
    ActiveEffects.Add(Effect);
    LastSpawnTime = Now;
    return Effect;
}

UNiagaraComponent* UWSImpactComponent::SpawnFromHit(const FHitResult& Hit, float Intensity, float Size)
{
    if (!Hit.bBlockingHit) return nullptr;
    const EPhysicalSurface Surface = UPhysicalMaterial::DetermineSurfaceType(Hit.PhysMaterial.Get());
    const EWSImpactKind* Kind = SurfaceKinds.Find(TEnumAsByte<EPhysicalSurface>(Surface));
    return SpawnImpact(Kind ? *Kind : EWSImpactKind::Concrete, Hit.ImpactPoint, Hit.ImpactNormal, Intensity, Size);
}

void UWSImpactComponent::ClearEffects()
{
    for (const auto& Effect : ActiveEffects) if (Effect.IsValid()) Effect->DestroyComponent();
    ActiveEffects.Empty();
    LastSpawnTime = -1000000.0;
}

void UWSImpactComponent::EndPlay(const EEndPlayReason::Type EndPlayReason)
{
    ClearEffects();
    Super::EndPlay(EndPlayReason);
}
