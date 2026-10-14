#include "ForgeHUD.h"
#include "ForgeCharacter.h"
#include "ForgeAbilityComponent.h"
#include "Engine/Canvas.h"
#include "GameFramework/PlayerController.h"
void AForgeHUD::DrawHUD()
{
    Super::DrawHUD();
    if (!Canvas || !PlayerOwner) return;
    AForgeCharacter* Character = Cast<AForgeCharacter>(PlayerOwner->GetPawn());
    if (!Character || !Character->Abilities) return;
    const float Width = Canvas->SizeX;
    const float Height = Canvas->SizeY;
    DrawRect(FLinearColor(0.025f,0.04f,0.07f,0.9f), 18,18,460,104);
    DrawText(TEXT("ABILITY FORGE / WILD STROKES"), FLinearColor(0.3f,1,0.8f), 34,30,nullptr,1.3f);
    DrawText(TEXT("WASD Move | Mouse Aim | LMB Fireball | RMB Lightning"), FLinearColor::White,34,62);
    DrawText(TEXT("Shift Dash | R Reset targets + cooldowns"), FLinearColor(0.7f,0.8f,0.9f),34,84);
    DrawRect(FLinearColor::White,Width/2-8,Height/2-1,16,2);
    DrawRect(FLinearColor::White,Width/2-1,Height/2-8,2,16);
    const EForgeAbility Kinds[] = {EForgeAbility::Fireball,EForgeAbility::Lightning,EForgeAbility::Dash};
    const TCHAR* Names[] = {TEXT("FIREBALL / LMB"),TEXT("LIGHTNING / RMB"),TEXT("DASH / SHIFT")};
    const FLinearColor Colors[] = {FLinearColor(1,0.45f,0.1f),FLinearColor(0.3f,0.7f,1),FLinearColor(0.2f,1,0.8f)};
    const float CardWidth = FMath::Min(210.f,(Width-60.f)/3.f);
    for (int32 Index=0;Index<3;++Index)
    {
        const float X = 18+Index*(CardWidth+8);
        const float Time = Character->Abilities->Remaining(Kinds[Index]);
        DrawRect(FLinearColor(0.025f,0.04f,0.07f,0.9f),X,Height-116,CardWidth,72);
        DrawText(Names[Index],Colors[Index],X+12,Height-104);
        const FString Status = Time <= 0 ? TEXT("READY") : FString::Printf(TEXT("%.1fs"),Time);
        DrawText(Status,FLinearColor::White,X+12,Height-81);
        const double Duration = ForgeRules::Durations[Index];
        const float Progress = FMath::Clamp(1.f-Time/static_cast<float>(Duration),0.f,1.f);
        DrawRect(Colors[Index],X+12,Height-54,(CardWidth-24)*Progress,3);
    }
    DrawText(Character->Abilities->Feedback,FLinearColor::White,18,Height-29);
}
