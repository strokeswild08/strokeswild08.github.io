#include "IVGameMode.h"
#include "IVFighter.h"
#include "IVHUD.h"
#include "Kismet/GameplayStatics.h"
#include "Components/DirectionalLightComponent.h"
#include "Components/LightComponent.h"
#include "Components/SkyLightComponent.h"
#include "Components/StaticMeshComponent.h"
#include "Engine/DirectionalLight.h"
#include "Engine/SkyLight.h"
#include "Engine/StaticMesh.h"
#include "Engine/StaticMeshActor.h"
#include "Engine/World.h"
#include "Materials/MaterialInstanceDynamic.h"

AIVGameMode::AIVGameMode()
{
    DefaultPawnClass=AIVFighter::StaticClass();
    HUDClass=AIVHUD::StaticClass();
}

void AIVGameMode::StartPlay()
{
    UWorld* World=GetWorld();
    UStaticMesh* Cube=LoadObject<UStaticMesh>(nullptr,TEXT("/Engine/BasicShapes/Cube.Cube"));
    auto Block=[&](FVector Location,FVector Scale,FLinearColor Color)
    {
        AStaticMeshActor* Actor=World->SpawnActor<AStaticMeshActor>(Location,FRotator::ZeroRotator);
        if (!Actor) return;
        UStaticMeshComponent* Mesh=Actor->GetStaticMeshComponent();
        Mesh->SetMobility(EComponentMobility::Movable);
        Mesh->SetStaticMesh(Cube);
        Mesh->SetWorldScale3D(Scale);
        Mesh->SetCollisionProfileName(TEXT("BlockAll"));
        if (UMaterialInstanceDynamic* Mat=Mesh->CreateAndSetMaterialInstanceDynamic(0))
            Mat->SetVectorParameterValue(TEXT("Color"),Color);
    };
    Block(FVector(0,0,-30),FVector(24,24,.6f),FLinearColor(.075f,.09f,.12f));
    for (int Sign : {-1,1})
    {
        Block(FVector(Sign*1220,0,100),FVector(.4f,24.8f,2.6f),FLinearColor(.13f,.16f,.2f));
        Block(FVector(0,Sign*1220,100),FVector(24.8f,.4f,2.6f),FLinearColor(.13f,.16f,.2f));
        for (int Other : {-1,1})
            Block(FVector(Sign*1000,Other*1000,180),FVector(1,1,3.6f),FLinearColor(.23f,.25f,.28f));
    }
    // Thin inlaid grid markings, with collision disabled so movement remains flat.
    for (int i=-4;i<=4;++i)
    {
        for (int Axis=0;Axis<2;++Axis)
        {
            AStaticMeshActor* Line=World->SpawnActor<AStaticMeshActor>(FVector(Axis==0 ? i*250 : 0,Axis==1 ? i*250 : 0,1),FRotator::ZeroRotator);
            if (!Line) continue;
            UStaticMeshComponent* Mesh=Line->GetStaticMeshComponent();
            Mesh->SetMobility(EComponentMobility::Movable);
            Mesh->SetStaticMesh(Cube);
            Mesh->SetWorldScale3D(Axis==0 ? FVector(.025f,23,.01f) : FVector(23,.025f,.01f));
            Mesh->SetCollisionEnabled(ECollisionEnabled::NoCollision);
            if (UMaterialInstanceDynamic* Mat=Mesh->CreateAndSetMaterialInstanceDynamic(0))
                Mat->SetVectorParameterValue(TEXT("Color"),FLinearColor(.2f,.25f,.3f));
        }
    }
    ADirectionalLight* Sun=World->SpawnActor<ADirectionalLight>(FVector(0,0,800),FRotator(-60,-35,0));
    if (Sun)
    {
        Sun->GetLightComponent()->SetMobility(EComponentMobility::Movable);
        Sun->GetLightComponent()->SetIntensity(4.f);
    }
    ASkyLight* Sky=World->SpawnActor<ASkyLight>();
    if (Sky)
    {
        Sky->GetLightComponent()->SetMobility(EComponentMobility::Movable);
        Sky->GetLightComponent()->SetIntensity(.8f);
        Sky->GetLightComponent()->RecaptureSky();
    }
    const FVector Spawns[]={FVector(200,0,100),FVector(450,420,100),FVector(450,-420,100)};
    for (const FVector& Location : Spawns)
    {
        AIVFighter* Enemy=World->SpawnActorDeferred<AIVFighter>(AIVFighter::StaticClass(),FTransform(FRotator(0,180,0),Location),nullptr,nullptr,ESpawnActorCollisionHandlingMethod::AdjustIfPossibleButAlwaysSpawn);
        if (Enemy)
        {
            Enemy->bEnemy=true;
            Enemy->FinishSpawning(FTransform(FRotator(0,180,0),Location));
        }
    }
    Super::StartPlay();
    // Possession timing differs between PIE and standalone; place the pawn after startup too.
    if (APawn* Player = UGameplayStatics::GetPlayerPawn(this,0))
        Player->SetActorLocation(FVector(-480,0,100),false,nullptr,ETeleportType::TeleportPhysics);
}
