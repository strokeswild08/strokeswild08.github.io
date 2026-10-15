#include "RangeGameMode.h"
#include "BreachCharacter.h"
#include "RangeHUD.h"
#include "RangeTarget.h"
#include "Components/DirectionalLightComponent.h"
#include "Components/LightComponent.h"
#include "Components/StaticMeshComponent.h"
#include "Engine/DirectionalLight.h"
#include "Engine/StaticMeshActor.h"
#include "Engine/World.h"
#include "Engine/StaticMesh.h"

ARangeGameMode::ARangeGameMode()
{
    DefaultPawnClass = ABreachCharacter::StaticClass();
    HUDClass = ARangeHUD::StaticClass();
}

void ARangeGameMode::AddBlock(FVector Location, FVector Scale)
{
    auto* Block = GetWorld()->SpawnActor<AStaticMeshActor>(Location, FRotator::ZeroRotator);
    if (!Block) return;
    auto* Mesh = Block->GetStaticMeshComponent();
    Mesh->SetMobility(EComponentMobility::Movable);
    Mesh->SetStaticMesh(LoadObject<UStaticMesh>(nullptr, TEXT("/Engine/BasicShapes/Cube.Cube")));
    Mesh->SetWorldScale3D(Scale);
    Mesh->SetCollisionProfileName(TEXT("BlockAll"));
}

void ARangeGameMode::StartPlay()
{
    // Centimetres. Runtime geometry means no binary level/Blueprint dependency.
    AddBlock(FVector(1100, 0, -25), FVector(30, 20, 0.5));
    AddBlock(FVector(2550, 0, 250), FVector(0.5, 20, 5));
    AddBlock(FVector(1100, -1025, 200), FVector(30, 0.5, 4));
    AddBlock(FVector(1100, 1025, 200), FVector(30, 0.5, 4));
    AddBlock(FVector(-425, 0, 200), FVector(0.5, 20, 4));
    for (int32 Index = 0; Index < 5; ++Index)
    {
        const float Y = (Index - 2) * 310.0f;
        const float X = 1200.0f + (Index % 2) * 700;
        AddBlock(FVector(X, Y, 40), FVector(0.18f, 0.18f, 0.8f));
        if (auto* Target = GetWorld()->SpawnActor<ARangeTarget>(FVector(X, Y, 160), FRotator::ZeroRotator))
            Target->SetNumber(Index + 1);
    }
    auto* Light = GetWorld()->SpawnActor<ADirectionalLight>(FVector(0, 0, 600), FRotator(-55, -20, 0));
    if (Light) Light->GetLightComponent()->SetIntensity(5.0f);
    Super::StartPlay();
}
