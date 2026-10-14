#include "ForgeEffectsComponent.h"
#include "ForgeBurst.h"
#include "Engine/World.h"
#include "Math/RotationMatrix.h"
#include "NiagaraComponent.h"
#include "NiagaraFunctionLibrary.h"
#include "NiagaraSystem.h"

UForgeEffectsComponent::UForgeEffectsComponent()
{
    PrimaryComponentTick.bCanEverTick = false;
    const EForgeFX Kinds[] = {EForgeFX::Fireball, EForgeFX::Explosion, EForgeFX::Lightning, EForgeFX::Dash, EForgeFX::Metal, EForgeFX::Stone, EForgeFX::Glass};
    const FLinearColor Colors[] = {FLinearColor(1,0.26f,0.04f), FLinearColor(1,0.45f,0.06f), FLinearColor(0.25f,0.65f,1), FLinearColor(0.15f,1,0.75f), FLinearColor(1,0.65f,0.15f), FLinearColor(0.6f,0.56f,0.5f), FLinearColor(0.4f,0.9f,1)};
    for (int32 Index = 0; Index < 7; ++Index) { FForgeEffectSlot Slot; Slot.Tint = Colors[Index]; Slots.Add(Kinds[Index], Slot); }
}
void UForgeEffectsComponent::Play(EForgeFX Kind, FVector Location, FVector Normal, FVector End)
{
    UWorld* World = GetWorld();
    if (!World || World->GetNetMode() == NM_DedicatedServer || Location.ContainsNaN() || Normal.ContainsNaN() || End.ContainsNaN()) return;
    const FForgeEffectSlot* Slot = Slots.Find(Kind);
    if (!Slot) return;
    ActiveNiagara.RemoveAll([](const TWeakObjectPtr<UNiagaraComponent>& Item) { return !Item.IsValid() || Item->IsComplete(); });
    ActiveBursts.RemoveAll([](const TWeakObjectPtr<AForgeBurst>& Item) { return !Item.IsValid(); });
    const FVector N = Normal.GetSafeNormal(SMALL_NUMBER, FVector::UpVector);
    if (Slot->System)
    {
        if (ActiveNiagara.Num() >= 32) return;
        UNiagaraComponent* FX = UNiagaraFunctionLibrary::SpawnSystemAtLocation(this, Slot->System.Get(), Location, FRotationMatrix::MakeFromZ(N).Rotator(), FVector::OneVector, true, false, ENCPoolMethod::None, false);
        if (!FX) return;
        FX->SetVariableLinearColor(TEXT("User.Color"), Slot->Tint);
        FX->SetVariableVec3(TEXT("User.Normal"), N);
        // Position type supports world-space beam endpoints under large-world coordinates.
        FX->SetVariablePosition(TEXT("User.End"), End);
        FX->SetVariableFloat(TEXT("User.Size"), 1.f);
        FX->Activate(true);
        ActiveNiagara.Add(FX);
    }
    else if (ActiveBursts.Num() < 24)
    {
        if (AForgeBurst* Burst = World->SpawnActor<AForgeBurst>(Location, FRotator::ZeroRotator))
        {
            Burst->Initialize(Kind, Slot->Tint, N);
            ActiveBursts.Add(Burst);
        }
    }
}
void UForgeEffectsComponent::ClearEffects()
{
    for (const auto& FX : ActiveNiagara) if (FX.IsValid()) FX->DestroyComponent();
    for (const auto& Burst : ActiveBursts) if (Burst.IsValid()) Burst->Destroy();
    ActiveNiagara.Empty(); ActiveBursts.Empty();
}
void UForgeEffectsComponent::EndPlay(const EEndPlayReason::Type Reason)
{
    ClearEffects(); Super::EndPlay(Reason);
}
