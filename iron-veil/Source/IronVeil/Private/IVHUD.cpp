#include "IVHUD.h"
#include "IVFighter.h"
#include "Engine/Canvas.h"
#include "Engine/Engine.h"
#include "Engine/World.h"
#include "EngineUtils.h"
#include "GameFramework/PlayerController.h"

void AIVHUD::Bar(float X,float Y,float W,float Value,FLinearColor Color)
{
    DrawRect(FLinearColor(.02f,.03f,.05f,.9f),X,Y,W,10);
    DrawRect(Color,X,Y,W*FMath::Clamp(Value/100.f,0.f,1.f),10);
}
void AIVHUD::DrawHUD()
{
    Super::DrawHUD();
    if (!Canvas || !PlayerOwner) return;
    AIVFighter* Player=Cast<AIVFighter>(PlayerOwner->GetPawn());
    if (!Player) return;
    UFont* Font=GEngine->GetSmallFont();
    const FLinearColor White=FLinearColor::White;
    const FLinearColor Orange(1,.55f,.16f);
    DrawRect(FLinearColor(.02f,.03f,.05f,.88f),20,20,390,139);
    DrawText(TEXT("WILD STROKES / COMBAT SYSTEMS"),FLinearColor(.6f,.7f,.75f),36,32,Font,1.f);
    DrawText(TEXT("IRON VEIL"),White,36,54,Font,2.f);
    Bar(36,103,350,Player->GetHealth(),FLinearColor(.9f,.19f,.18f));
    Bar(36,127,350,Player->GetStamina(),Orange);
    int Alive=0;
    for (TActorIterator<AIVFighter> It(GetWorld());It;++It)
    {
        if (!It->bEnemy || !It->IsAlive()) continue;
        ++Alive;
        FVector2D Screen;
        if (PlayerOwner->ProjectWorldLocationToScreen(It->GetActorLocation()+FVector(0,0,120),Screen))
        {
            Bar(Screen.X-40,Screen.Y,80,It->GetHealth(),Orange);
            const auto& Combat=It->GetCombat();
            if (Combat.phase==iron::Phase::Attack && Combat.elapsed<Combat.rules.windup)
                DrawText(TEXT("STRIKE INCOMING"),Orange,Screen.X-60,Screen.Y-22,Font,.9f);
            if (Player->GetLockTarget()==*It)
                DrawText(TEXT("[ LOCKED ]"),FLinearColor(.1f,.8f,1.f),Screen.X-38,Screen.Y-44,Font,1.f);
        }
    }
    DrawText(FString::Printf(TEXT("OPPONENTS  %d / 3"),Alive),Orange,Canvas->SizeX-230,32,Font,1.1f);
    DrawRect(FLinearColor(.02f,.03f,.05f,.86f),20,Canvas->SizeY-84,Canvas->SizeX-40,64);
    DrawText(TEXT("WASD Move   |   Mouse Look   |   LMB Attack / buffer combo   |   SPACE Dodge"),White,36,Canvas->SizeY-72,Font,1.f);
    DrawText(TEXT("TAB Lock / release   |   F1 Debug   |   R Restart   |   Gold flash = enemy windup"),Orange,36,Canvas->SizeY-47,Font,1.f);
    if (Player->bShowDebug)
    {
        const auto& C=Player->GetCombat();
        const TCHAR* Names[]={TEXT("READY"),TEXT("ATTACK"),TEXT("DODGE"),TEXT("STAGGER"),TEXT("DEAD")};
        DrawText(FString::Printf(TEXT("STATE %s   COMBO %d   STAMINA %.1f   I-FRAMES %s"),Names[static_cast<int>(C.phase)],C.combo,C.stamina,C.Invulnerable() ? TEXT("YES") : TEXT("NO")),White,36,180,Font,1.f);
    }
    if (!Player->IsAlive() || Alive==0)
    {
        DrawRect(FLinearColor(0,0,0,.7f),Canvas->SizeX*.22f,Canvas->SizeY*.38f,Canvas->SizeX*.56f,120);
        DrawText(Player->IsAlive() ? TEXT("ARENA CLEARED") : TEXT("DEFEATED"),Orange,Canvas->SizeX*.3f,Canvas->SizeY*.4f,Font,2.5f);
        DrawText(TEXT("Press R to restart"),White,Canvas->SizeX*.3f,Canvas->SizeY*.4f+55,Font,1.2f);
    }
}
