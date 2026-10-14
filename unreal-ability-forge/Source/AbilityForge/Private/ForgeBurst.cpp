#include "ForgeVisuals.h"
#include "ForgeBurst.h"
#include "Components/InstancedStaticMeshComponent.h"
#include "Components/PointLightComponent.h"
#include "Engine/StaticMesh.h"
#include "Materials/MaterialInstanceDynamic.h"
#include "UObject/ConstructorHelpers.h"

AForgeBurst::AForgeBurst()
{
    PrimaryActorTick.bCanEverTick = true;
    Pieces = CreateDefaultSubobject<UInstancedStaticMeshComponent>(TEXT("Pieces"));
    SetRootComponent(Pieces);
    Pieces->SetCollisionEnabled(ECollisionEnabled::NoCollision);
    Pieces->SetMobility(EComponentMobility::Movable);
    static ConstructorHelpers::FObjectFinder<UStaticMesh> Cube(TEXT("/Engine/BasicShapes/Cube.Cube"));
    if (Cube.Succeeded()) Pieces->SetStaticMesh(Cube.Object);
    Light = CreateDefaultSubobject<UPointLightComponent>(TEXT("PulseLight"));
    Light->SetupAttachment(Pieces);
    Light->SetIntensity(1500);
    Light->SetAttenuationRadius(350);
    Light->SetCastShadows(false);
    SetActorEnableCollision(false);
}
void AForgeBurst::Initialize(EForgeFX Kind, const FLinearColor& Color, const FVector& Normal)
{
    Light->SetLightColor(Color);
    ForgeVisuals::Tint(Pieces, Color, true);
    FRandomStream Random(7919 + static_cast<int32>(Kind));
    const int32 Count = Kind == EForgeFX::Explosion ? 28 : 16;
    const float Speed = Kind == EForgeFX::Metal ? 550.f : (Kind == EForgeFX::Stone ? 190.f : 320.f);
    const FVector N = Normal.GetSafeNormal(SMALL_NUMBER, FVector::UpVector);
    for (int32 Index = 0; Index < Count; ++Index)
    {
        const FVector Direction = (Random.VRand() + N * 1.2f).GetSafeNormal();
        FPiece Piece{FVector::ZeroVector, Direction * Random.FRandRange(Speed * 0.4f, Speed), Random.FRandRange(0.025f, Kind == EForgeFX::Stone ? 0.095f : 0.05f)};
        Particles.Add(Piece);
        Pieces->AddInstance(FTransform(FRotator::ZeroRotator, FVector::ZeroVector, FVector(Piece.Scale)));
    }
    SetLifeSpan(Lifetime + 0.1f);
}
void AForgeBurst::Tick(float Delta)
{
    Super::Tick(Delta);
    Age += Delta;
    const float Fade = FMath::Clamp(1.f - Age / Lifetime, 0.f, 1.f);
    Light->SetIntensity(1500.f * Fade);
    for (int32 Index = 0; Index < Particles.Num(); ++Index)
    {
        FPiece& Piece = Particles[Index];
        Piece.Velocity.Z -= 500.f * Delta;
        Piece.Position += Piece.Velocity * Delta;
        const FTransform Transform(FRotator(Age * 180.f, Index * 37.f, Age * 90.f), Piece.Position, FVector(Piece.Scale * Fade));
        Pieces->UpdateInstanceTransform(Index, Transform, false, Index == Particles.Num() - 1, true);
    }
}
