#include "ForgeVisuals.h"
#include "ForgeGameMode.h"
#include "ForgeCharacter.h"
#include "ForgeHUD.h"
#include "ForgeTarget.h"
#include "Components/StaticMeshComponent.h"
#include "Components/PointLightComponent.h"
#include "Engine/PointLight.h"
#include "Engine/StaticMesh.h"
#include "Engine/StaticMeshActor.h"
#include "Engine/World.h"
#include "EngineUtils.h"
#include "GameFramework/PlayerStart.h"
#include "Materials/MaterialInstanceDynamic.h"

AForgeGameMode::AForgeGameMode()
{
    DefaultPawnClass = AForgeCharacter::StaticClass();
    HUDClass = AForgeHUD::StaticClass();
}
void AForgeGameMode::InitGame(const FString& MapName, const FString& Options, FString& ErrorMessage)
{
    Super::InitGame(MapName,Options,ErrorMessage);
    bool HasStart = false;
    for (TActorIterator<APlayerStart> It(GetWorld()); It; ++It) { HasStart = true; break; }
    if (!HasStart) GetWorld()->SpawnActor<APlayerStart>(FVector(-950,0,100), FRotator::ZeroRotator);
}
void AForgeGameMode::StartPlay()
{
    BuildArena();
    Super::StartPlay();
}
void AForgeGameMode::BuildArena()
{
    UWorld* World = GetWorld();
    UStaticMesh* Cube = LoadObject<UStaticMesh>(nullptr,TEXT("/Engine/BasicShapes/Cube.Cube"));
    if (!World || !Cube) return;
    auto Block = [&](FVector Location, FVector Scale, FLinearColor Color)
    {
        AStaticMeshActor* Actor = World->SpawnActor<AStaticMeshActor>(Location, FRotator::ZeroRotator);
        if (!Actor) return;
        UStaticMeshComponent* Mesh = Actor->GetStaticMeshComponent();
        Mesh->SetMobility(EComponentMobility::Movable);
        Mesh->SetStaticMesh(Cube);
        Mesh->SetCollisionProfileName(TEXT("BlockAll"));
        Actor->SetActorScale3D(Scale);
        ForgeVisuals::Tint(Mesh,Color);
    };
    Block(FVector(0,0,-25),FVector(32,22,0.5f),FLinearColor(0.08f,0.11f,0.16f));
    Block(FVector(0,-1100,120),FVector(32,0.3f,3),FLinearColor(0.15f,0.2f,0.25f));
    Block(FVector(0,1100,120),FVector(32,0.3f,3),FLinearColor(0.15f,0.2f,0.25f));
    Block(FVector(1600,0,120),FVector(0.3f,22,3),FLinearColor(0.15f,0.2f,0.25f));
    Block(FVector(-1600,0,120),FVector(0.3f,22,3),FLinearColor(0.15f,0.2f,0.25f));
    Block(FVector(250,-320,80),FVector(0.7f,3,1.6f),FLinearColor(0.22f,0.25f,0.29f));
    Block(FVector(250,320,80),FVector(0.7f,3,1.6f),FLinearColor(0.22f,0.25f,0.29f));
    for (int32 Row=0;Row<2;++Row)
    {
        for (int32 Column=0;Column<3;++Column)
        {
            const FVector Location(650+Row*500,(Column-1)*650,70);
            if (AForgeTarget* Target=World->SpawnActor<AForgeTarget>(Location,FRotator::ZeroRotator)) Target->Configure(Column+1);
        }
    }
    for (int32 Index=0;Index<3;++Index)
    {
        if (APointLight* Light=World->SpawnActor<APointLight>(FVector(-700+Index*700,0,600),FRotator::ZeroRotator))
        {
            Light->GetPointLightComponent()->SetMobility(EComponentMobility::Movable);
            Light->GetPointLightComponent()->SetIntensity(30000);
            Light->GetPointLightComponent()->SetAttenuationRadius(1900);
            Light->GetPointLightComponent()->SetCastShadows(false);
        }
    }
}
