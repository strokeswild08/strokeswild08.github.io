#include "ForgeVisuals.h"
#include "ForgeBeam.h"
#include "Components/InstancedStaticMeshComponent.h"
#include "Engine/StaticMesh.h"
#include "Materials/MaterialInstanceDynamic.h"
#include "UObject/ConstructorHelpers.h"
AForgeBeam::AForgeBeam()
{
    Segments = CreateDefaultSubobject<UInstancedStaticMeshComponent>(TEXT("BeamSegments"));
    SetRootComponent(Segments);
    Segments->SetCollisionEnabled(ECollisionEnabled::NoCollision);
    Segments->SetMobility(EComponentMobility::Movable);
    static ConstructorHelpers::FObjectFinder<UStaticMesh> Cube(TEXT("/Engine/BasicShapes/Cube.Cube"));
    if (Cube.Succeeded()) Segments->SetStaticMesh(Cube.Object);
    SetLifeSpan(0.16f);
}
void AForgeBeam::Initialize(FVector Start, FVector End)
{
    ForgeVisuals::Tint(Segments, FLinearColor(0.2f,0.65f,1), true);
    FVector Previous = FVector::ZeroVector;
    const FVector Delta = End - Start;
    FRandomStream Random(73);
    for (int32 Index = 1; Index <= 10; ++Index)
    {
        FVector Next = Delta * (static_cast<float>(Index)/10);
        if (Index != 10) Next += Random.VRand() * 22;
        const FVector Step = Next - Previous;
        Segments->AddInstance(FTransform(Step.Rotation(), (Next+Previous)*0.5f, FVector(Step.Size()/100.f,0.018f,0.018f)));
        Previous = Next;
    }
}
