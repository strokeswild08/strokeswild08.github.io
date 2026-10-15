#pragma once
#include "CoreMinimal.h"
#include "GameFramework/HUD.h"
#include "RangeHUD.generated.h"

UCLASS()
class BREACHLINE_API ARangeHUD : public AHUD
{
    GENERATED_BODY()
public:
    virtual void DrawHUD() override;
};
