#pragma once
#include "CoreMinimal.h"
#include "GameFramework/HUD.h"
#include "IVHUD.generated.h"
UCLASS()
class IRONVEIL_API AIVHUD : public AHUD
{
    GENERATED_BODY()
public:
    virtual void DrawHUD() override;
private:
    void Bar(float X,float Y,float W,float Value,FLinearColor Color);
};
