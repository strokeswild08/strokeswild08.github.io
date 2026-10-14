#pragma once
#include "CoreMinimal.h"
#include "GameFramework/GameModeBase.h"
#include "ForgeGameMode.generated.h"
UCLASS()
class ABILITYFORGE_API AForgeGameMode : public AGameModeBase
{
    GENERATED_BODY()
public:
    AForgeGameMode();
    virtual void InitGame(const FString& MapName, const FString& Options, FString& ErrorMessage) override;
    virtual void StartPlay() override;
private:
    void BuildArena();
};
