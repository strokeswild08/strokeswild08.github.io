#include "IVFighter.h"
#include "Camera/CameraComponent.h"
#include "Components/CapsuleComponent.h"
#include "Components/InputComponent.h"
#include "Components/StaticMeshComponent.h"
#include "Engine/DamageEvents.h"
#include "Engine/World.h"
#include "Engine/StaticMesh.h"
#include "EngineUtils.h"
#include "DrawDebugHelpers.h"
#include "GameFramework/CharacterMovementComponent.h"
#include "GameFramework/DamageType.h"
#include "GameFramework/PlayerController.h"
#include "GameFramework/SpringArmComponent.h"
#include "Kismet/GameplayStatics.h"
#include "Materials/MaterialInstanceDynamic.h"
#include "UObject/ConstructorHelpers.h"

AIVFighter::AIVFighter()
{
    PrimaryActorTick.bCanEverTick = true;
    GetCapsuleComponent()->InitCapsuleSize(38.f, 88.f);
    bUseControllerRotationYaw = false;
    AutoPossessAI = EAutoPossessAI::Disabled;
    GetCharacterMovement()->bRunPhysicsWithNoController = true;
    GetCharacterMovement()->MaxWalkSpeed = 430.f;
    GetCharacterMovement()->bOrientRotationToMovement = true;
    GetCharacterMovement()->RotationRate = FRotator(0.f, 660.f, 0.f);
    static ConstructorHelpers::FObjectFinder<UStaticMesh> Cube(TEXT("/Engine/BasicShapes/Cube.Cube"));
    static ConstructorHelpers::FObjectFinder<UStaticMesh> Sphere(TEXT("/Engine/BasicShapes/Sphere.Sphere"));
    Body = CreateDefaultSubobject<UStaticMeshComponent>(TEXT("Body"));
    Body->SetupAttachment(GetRootComponent());
    Body->SetStaticMesh(Cube.Object);
    Body->SetRelativeScale3D(FVector(.46f,.62f,1.05f));
    Body->SetRelativeLocation(FVector(0,0,-12));
    Body->SetCollisionEnabled(ECollisionEnabled::NoCollision);
    Head = CreateDefaultSubobject<UStaticMeshComponent>(TEXT("Head"));
    Head->SetupAttachment(GetRootComponent());
    Head->SetStaticMesh(Sphere.Object);
    Head->SetRelativeScale3D(FVector(.40f));
    Head->SetRelativeLocation(FVector(0,0,61));
    Head->SetCollisionEnabled(ECollisionEnabled::NoCollision);
    Blade = CreateDefaultSubobject<UStaticMeshComponent>(TEXT("Blade"));
    Blade->SetupAttachment(GetRootComponent());
    Blade->SetStaticMesh(Cube.Object);
    Blade->SetRelativeScale3D(FVector(.85f,.075f,.10f));
    Blade->SetRelativeLocation(FVector(50,47,3));
    Blade->SetCollisionEnabled(ECollisionEnabled::NoCollision);
    Boom = CreateDefaultSubobject<USpringArmComponent>(TEXT("CameraBoom"));
    Boom->SetupAttachment(GetRootComponent());
    Boom->TargetArmLength = 460.f;
    Boom->SocketOffset = FVector(0,60,105);
    Boom->bUsePawnControlRotation = true;
    Boom->bEnableCameraLag = true;
    Boom->CameraLagSpeed = 12.f;
    Camera = CreateDefaultSubobject<UCameraComponent>(TEXT("Camera"));
    Camera->SetupAttachment(Boom);
    Camera->FieldOfView = 85.f;
}

void AIVFighter::BeginPlay()
{
    Super::BeginPlay();
    if (bEnemy)
    {
        Combat.rules.windup = .60f;
        Combat.rules.recovery = .55f;
        GetCharacterMovement()->MaxWalkSpeed = 240.f;
        EnemyCooldown = FMath::FRandRange(.7f,1.6f);
    }
    else if (IsPlayerControlled())
    {
        SetActorLocation(FVector(-480,0,100));
        if (Controller) Controller->SetControlRotation(FRotator(-15,0,0));
    }
}

void AIVFighter::SetupPlayerInputComponent(UInputComponent* Input)
{
    Super::SetupPlayerInputComponent(Input);
    Input->BindAxis(TEXT("MoveForward"),this,&AIVFighter::MoveForward);
    Input->BindAxis(TEXT("MoveRight"),this,&AIVFighter::MoveRight);
    Input->BindAxis(TEXT("LookYaw"),this,&AIVFighter::LookYaw);
    Input->BindAxis(TEXT("LookPitch"),this,&AIVFighter::LookPitch);
    Input->BindAction(TEXT("Attack"),IE_Pressed,this,&AIVFighter::Attack);
    Input->BindAction(TEXT("Dodge"),IE_Pressed,this,&AIVFighter::Dodge);
    Input->BindAction(TEXT("LockOn"),IE_Pressed,this,&AIVFighter::ToggleLock);
    Input->BindAction(TEXT("Restart"),IE_Pressed,this,&AIVFighter::Restart);
    Input->BindAction(TEXT("Debug"),IE_Pressed,this,&AIVFighter::ToggleDebug);
}

void AIVFighter::MoveForward(float Value)
{
    if (Controller && Combat.phase == iron::Phase::Ready)
        AddMovementInput(FRotationMatrix(FRotator(0,Controller->GetControlRotation().Yaw,0)).GetUnitAxis(EAxis::X), Value);
}
void AIVFighter::MoveRight(float Value)
{
    if (Controller && Combat.phase == iron::Phase::Ready)
        AddMovementInput(FRotationMatrix(FRotator(0,Controller->GetControlRotation().Yaw,0)).GetUnitAxis(EAxis::Y), Value);
}
void AIVFighter::LookYaw(float Value) { if (!LockTarget.IsValid() && IsAlive()) AddControllerYawInput(Value); }
void AIVFighter::LookPitch(float Value) { if (!LockTarget.IsValid() && IsAlive()) AddControllerPitchInput(Value); }
void AIVFighter::Attack()
{
    if (Combat.Attack()) GetCharacterMovement()->StopMovementImmediately();
}
void AIVFighter::Dodge()
{
    if (!GetCharacterMovement()->IsMovingOnGround()) return;
    FVector Direction = GetLastMovementInputVector().GetSafeNormal2D();
    if (Direction.IsNearlyZero()) Direction = GetActorForwardVector();
    if (Combat.Dodge())
    {
        DodgeDirection = Direction;
        GetCharacterMovement()->StopMovementImmediately();
    }
}

bool AIVFighter::CanSee(const AIVFighter* Other) const
{
    if (!Other) return false;
    FHitResult Hit;
    FCollisionQueryParams Params(SCENE_QUERY_STAT(IronVeilSight),false,this);
    const FVector Start = GetActorLocation()+FVector(0,0,30);
    const FVector End = Other->GetActorLocation()+FVector(0,0,30);
    return !GetWorld()->LineTraceSingleByChannel(Hit,Start,End,ECC_Visibility,Params) || Hit.GetActor()==Other;
}

void AIVFighter::ToggleLock()
{
    if (LockTarget.IsValid()) { LockTarget.Reset(); return; }
    if (!IsAlive()) return;
    float BestScore = BIG_NUMBER;
    const FVector Forward = Camera->GetForwardVector().GetSafeNormal2D();
    for (TActorIterator<AIVFighter> It(GetWorld()); It; ++It)
    {
        AIVFighter* Candidate = *It;
        if (Candidate==this || Candidate->bEnemy==bEnemy || !Candidate->IsAlive()) continue;
        const FVector Offset = Candidate->GetActorLocation()-GetActorLocation();
        const float Distance = Offset.Size2D();
        const float Dot = FVector::DotProduct(Forward,Offset.GetSafeNormal2D());
        if (Distance>1200.f || Dot<.15f || !CanSee(Candidate)) continue;
        const float Score = Distance+(1.f-Dot)*500.f;
        if (Score<BestScore) { BestScore=Score; LockTarget=Candidate; }
    }
}

void AIVFighter::ResolveStrike()
{
    // One event per strike, one hit per opposing fighter. No repeated overlap damage.
    for (TActorIterator<AIVFighter> It(GetWorld()); It; ++It)
    {
        AIVFighter* Victim = *It;
        if (Victim==this || Victim->bEnemy==bEnemy || !Victim->IsAlive()) continue;
        const FVector Offset = Victim->GetActorLocation()-GetActorLocation();
        if (Offset.Size2D()>AttackReach || FMath::Abs(Offset.Z)>100.f) continue;
        if (FVector::DotProduct(GetActorForwardVector(),Offset.GetSafeNormal2D())<.35f || !CanSee(Victim)) continue;
        const float Damage = bEnemy ? 18.f : (18.f+Combat.combo*6.f);
        const float Applied = UGameplayStatics::ApplyDamage(Victim,Damage,Controller,this,UDamageType::StaticClass());
        if (Applied>0.f && bShowDebug)
            DrawDebugSphere(GetWorld(),Victim->GetActorLocation(),50,12,FColor::Orange,false,.15f);
    }
}

float AIVFighter::TakeDamage(float Amount,const FDamageEvent& Event,AController* Instigator,AActor* Causer)
{
    if (!Combat.Damage(Amount)) return 0.f;
    FlashTime = .16f;
    GetCharacterMovement()->StopMovementImmediately();
    if (!Combat.Alive())
    {
        GetCapsuleComponent()->SetCollisionEnabled(ECollisionEnabled::NoCollision);
        GetCharacterMovement()->DisableMovement();
        LockTarget.Reset();
    }
    return Amount;
}

void AIVFighter::TickEnemy(float Dt)
{
    AIVFighter* Player = Cast<AIVFighter>(UGameplayStatics::GetPlayerPawn(this,0));
    if (!Player || !Player->IsAlive()) { Intent=TEXT("WAIT"); return; }
    const FVector Offset = Player->GetActorLocation()-GetActorLocation();
    const float Distance = Offset.Size2D();
    EnemyCooldown -= Dt;
    if (Combat.phase!=iron::Phase::Ready)
    {
        Intent = Combat.phase==iron::Phase::Attack ?
            (Combat.elapsed<Combat.rules.windup ? TEXT("WINDUP") : TEXT("RECOVERY")) : TEXT("STAGGER");
        return;
    }
    SetActorRotation(FMath::RInterpTo(GetActorRotation(),FRotator(0,Offset.Rotation().Yaw,0),Dt,7.f));
    GetCharacterMovement()->bOrientRotationToMovement = false;
    if (Distance>145.f)
    {
        Intent=TEXT("APPROACH");
        AddMovementInput(Offset.GetSafeNormal2D(),1.f,true);
    }
    else if (EnemyCooldown<=0 && CanSee(Player))
    {
        Intent=TEXT("TELEGRAPH"); Attack();
        EnemyCooldown=FMath::FRandRange(1.4f,2.2f);
    }
    else
    {
        Intent=TEXT("CIRCLE");
        const FVector Side = FVector::CrossProduct(Offset.GetSafeNormal2D(),FVector::UpVector);
        AddMovementInput(Side,.35f,true);
    }
}

void AIVFighter::UpdateVisuals(float Dt)
{
    FlashTime = FMath::Max(0.f,FlashTime-Dt);
    const bool Telegraph = bEnemy && Combat.phase==iron::Phase::Attack && Combat.elapsed<Combat.rules.windup;
    const FLinearColor Color = FlashTime>0 ? FLinearColor::White :
        (!IsAlive() ? FLinearColor(.08f,.10f,.12f) :
        (Telegraph ? FLinearColor(1.f,.65f,.06f) :
        (bEnemy ? FLinearColor(.9f,.12f,.08f) : FLinearColor(.05f,.65f,.9f))));
    // BasicShapeMaterial exposes the Color parameter. Cache MID once per primitive.
    for (UStaticMeshComponent* Part : {Body.Get(),Head.Get()})
    {
        UMaterialInstanceDynamic* Material=Cast<UMaterialInstanceDynamic>(Part->GetMaterial(0));
        if (!Material) Material=Part->CreateAndSetMaterialInstanceDynamic(0);
        if (Material) Material->SetVectorParameterValue(TEXT("Color"),Color);
    }
    if (!IsAlive())
    {
        Body->SetRelativeRotation(FRotator(0,0,80));
        Head->SetVisibility(false);
        Blade->SetVisibility(false);
        return;
    }
    const bool Swing=Combat.phase==iron::Phase::Attack;
    const float Alpha=FMath::Clamp((Combat.elapsed-Combat.rules.windup+.10f)/.25f,0.f,1.f);
    const float Yaw=Swing ? FMath::Lerp(-75.f,85.f,Alpha) : -10.f;
    Blade->SetRelativeRotation(FRotator(0,Yaw,0));
    Blade->SetRelativeLocation(FVector(60.f,30.f,Combat.phase==iron::Phase::Dodge ? -30.f : 0.f));
    Body->SetRelativeRotation(FRotator(Combat.phase==iron::Phase::Dodge ? 40.f : 0.f,0,0));
}

void AIVFighter::Tick(float Dt)
{
    Super::Tick(Dt);
    // Small steps preserve hit-window ordering during ordinary frame hitches.
    float Remaining=FMath::Min(Dt,.25f);
    while (Remaining>0.f)
    {
        const float Step=FMath::Min(Remaining,.01f);
        if (Combat.Tick(Step)) ResolveStrike();
        Remaining-=Step;
    }
    if (!IsAlive()) { UpdateVisuals(Dt); return; }
    if (LockTarget.IsValid() && (!LockTarget->IsAlive() || GetDistanceTo(LockTarget.Get())>1500.f || !CanSee(LockTarget.Get())))
        LockTarget.Reset();
    if (bEnemy) TickEnemy(Dt);
    else if (LockTarget.IsValid())
    {
        const FVector Offset=LockTarget->GetActorLocation()-GetActorLocation();
        const FRotator Facing(0,Offset.Rotation().Yaw,0);
        SetActorRotation(FMath::RInterpTo(GetActorRotation(),Facing,Dt,10.f));
        if (Controller) Controller->SetControlRotation(FMath::RInterpTo(Controller->GetControlRotation(),FRotator(-12,Facing.Yaw,0),Dt,6.f));
    }
    GetCharacterMovement()->bOrientRotationToMovement=!bEnemy && !LockTarget.IsValid();
    if (Combat.phase==iron::Phase::Dodge)
        SetActorLocation(GetActorLocation()+DodgeDirection*760.f*Dt,true);
    UpdateVisuals(Dt);
    if (bShowDebug)
    {
        DrawDebugDirectionalArrow(GetWorld(),GetActorLocation(),GetActorLocation()+GetActorForwardVector()*AttackReach,30,FColor::Cyan,false,0,0,2);
        DrawDebugString(GetWorld(),GetActorLocation()+FVector(0,0,120),Intent,nullptr,FColor::White,0,true);
    }
}
void AIVFighter::Restart() { UGameplayStatics::OpenLevel(this,FName(TEXT("/Engine/Maps/Entry"))); }
void AIVFighter::ToggleDebug()
{
    const bool Next = !bShowDebug;
    for (TActorIterator<AIVFighter> It(GetWorld());It;++It) It->bShowDebug=Next;
}
