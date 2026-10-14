#pragma once
#include "CoreMinimal.h"
#include "Components/MeshComponent.h"
#include "Materials/MaterialInterface.h"
#include "Materials/MaterialInstanceDynamic.h"
// Setup script authors these material assets in the local editor; no assets are bundled.
namespace ForgeVisuals
{
    inline void Tint(UMeshComponent* Mesh, FLinearColor Color, bool Glow = false)
    {
        if (!Mesh) return;
        const TCHAR* Path = Glow ? TEXT("/Game/Materials/M_ForgeGlow.M_ForgeGlow") : TEXT("/Game/Materials/M_ForgeTint.M_ForgeTint");
        if (UMaterialInterface* Base = LoadObject<UMaterialInterface>(nullptr, Path)) Mesh->SetMaterial(0, Base);
        if (UMaterialInstanceDynamic* Dynamic = Mesh->CreateDynamicMaterialInstance(0)) Dynamic->SetVectorParameterValue(TEXT("Color"), Color);
    }
}
