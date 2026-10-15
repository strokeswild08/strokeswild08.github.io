#pragma once
#include "CoreMinimal.h"
#include "GameFramework/GameModeBase.h"
#include "IVGameMode.generated.h"
UCLASS()
class IRONVEIL_API AIVGameMode : public AGameModeBase
{
    GENERATED_BODY()
public:
    AIVGameMode();
    virtual void StartPlay() override;
};
