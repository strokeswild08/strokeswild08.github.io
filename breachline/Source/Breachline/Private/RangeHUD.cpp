#include "RangeHUD.h"
#include "BreachCharacter.h"
#include "BreachWeaponComponent.h"
#include "Engine/Canvas.h"
#include "GameFramework/PlayerController.h"

void ARangeHUD::DrawHUD()
{
    Super::DrawHUD();
    const auto* Character = PlayerOwner ? Cast<ABreachCharacter>(PlayerOwner->GetPawn()) : nullptr;
    if (!Canvas || !Character) return;
    const FLinearColor Cream(0.93f, 0.91f, 0.83f);
    const FLinearColor Amber(0.96f, 0.61f, 0.30f);
    DrawRect(FLinearColor(0.03f, 0.06f, 0.07f, 0.88f), 20, 20, 530, 124);
    DrawText(TEXT("BREACHLINE / WEAPON MECHANICS"), Amber, 36, 30, nullptr, 1.4f);
    DrawText(FString::Printf(TEXT("%02d / %02d    %s"), Character->Weapon->Magazine(),
        Character->Weapon->Reserve(), *Character->Weapon->StateLabel()), Cream, 36, 65, nullptr, 1.3f);
    DrawText(FString::Printf(TEXT("SHOTS %d   HITS %d   ACCURACY %.0f%%"), Character->Shots,
        Character->Hits, Character->Shots ? 100.0f * Character->Hits / Character->Shots : 0), Cream, 36, 98);
    DrawRect(Amber, 36, 130, 490 * Character->Weapon->ActionProgress(), 3);
    DrawText(TEXT("WASD move | Mouse aim | LMB fire | RMB focus | R reload | F clear | J jam | T reset"),
        Cream, 24, Canvas->SizeY - 35);
    const float X = Canvas->SizeX * 0.5f;
    const float Y = Canvas->SizeY * 0.5f;
    const FLinearColor Reticle = Character->HitFeedback > 0 ? Amber : Cream;
    DrawLine(X - 8, Y, X - 3, Y, Reticle);
    DrawLine(X + 3, Y, X + 8, Y, Reticle);
    DrawLine(X, Y - 8, X, Y - 3, Reticle);
    DrawLine(X, Y + 3, X, Y + 8, Reticle);
}
