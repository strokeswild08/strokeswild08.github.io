#pragma once
#include "CoreMinimal.h"
#include "GameFramework/HUD.h"
#include "ForgeHUD.generated.h"
UCLASS()
class ABILITYFORGE_API AForgeHUD : public AHUD
{
    GENERATED_BODY()
public:
    virtual void DrawHUD() override;
};
