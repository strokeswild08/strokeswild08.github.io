#pragma once
#include "CoreMinimal.h"
#include "GameFramework/GameModeBase.h"
#include "RangeGameMode.generated.h"

UCLASS()
class BREACHLINE_API ARangeGameMode : public AGameModeBase
{
    GENERATED_BODY()
public:
    ARangeGameMode();
    virtual void StartPlay() override;
private:
    void AddBlock(FVector Location, FVector Scale);
};
