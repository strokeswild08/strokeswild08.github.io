#pragma once

// The same state machine used by the Unreal component and native tests.
// No engine headers, global clocks, random generators or callbacks here.
#include <algorithm>
#include <cmath>

namespace Breachline
{
enum class Phase { Ready, Reloading, Jammed, Clearing };
enum class Shot { Fired, Busy, Empty, Jammed };

struct Settings
{
    int Capacity = 12;
    int InitialReserve = 60;
    double ShotInterval = 0.15;
    double ReloadSeconds = 1.8;
    double ClearSeconds = 1.0;
    double JamProbability = 0.06;
};

class Weapon
{
public:
    explicit Weapon(Settings In = {}) : Config(In)
    {
        Config.Capacity = std::clamp(Config.Capacity, 1, 1000);
        Config.InitialReserve = std::clamp(Config.InitialReserve, 0, 1000000);
        Config.ShotInterval = Positive(Config.ShotInterval, 0.15);
        Config.ReloadSeconds = Positive(Config.ReloadSeconds, 1.8);
        Config.ClearSeconds = Positive(Config.ClearSeconds, 1.0);
        Config.JamProbability = std::isfinite(Config.JamProbability)
            ? std::clamp(Config.JamProbability, 0.0, 1.0) : 0.06;
        Reset();
    }

    void Reset()
    {
        Magazine = Config.Capacity;
        Reserve = Config.InitialReserve;
        Current = Phase::Ready;
        Cooldown = Remaining = 0;
        FiredCount = 0;
    }

    void Advance(double Seconds)
    {
        if (!std::isfinite(Seconds) || Seconds <= 0) return;
        Cooldown = std::max(0.0, Cooldown - Seconds);
        if (Current != Phase::Reloading && Current != Phase::Clearing) return;
        Remaining = std::max(0.0, Remaining - Seconds);
        if (Remaining > 1e-9) return;
        if (Current == Phase::Reloading)
        {
            const int Transfer = std::min(Config.Capacity - Magazine, Reserve);
            Magazine += Transfer;
            Reserve -= Transfer;
        }
        Remaining = 0;
        Current = Phase::Ready;
    }

    Shot TryFire(double Random01)
    {
        if (Current == Phase::Jammed) return Shot::Jammed;
        if (Current != Phase::Ready || Cooldown > 1e-9) return Shot::Busy;
        if (Magazine == 0) return Shot::Empty;
        // Invalid external randomness is rejected without mutating the weapon.
        if (!std::isfinite(Random01) || Random01 < 0 || Random01 >= 1) return Shot::Busy;
        if (Random01 < Config.JamProbability)
        {
            Current = Phase::Jammed;
            return Shot::Jammed;
        }
        --Magazine;
        ++FiredCount;
        Cooldown = Config.ShotInterval;
        return Shot::Fired;
    }

    bool Reload()
    {
        if (Current != Phase::Ready || Magazine == Config.Capacity || Reserve == 0) return false;
        Current = Phase::Reloading;
        Remaining = Config.ReloadSeconds;
        return true;
    }

    bool Clear()
    {
        if (Current != Phase::Jammed) return false;
        Current = Phase::Clearing;
        Remaining = Config.ClearSeconds;
        return true;
    }

    bool ForceJam()
    {
        if (Current != Phase::Ready || Magazine == 0) return false;
        Current = Phase::Jammed;
        return true;
    }

    Phase GetPhase() const { return Current; }
    int GetMagazine() const { return Magazine; }
    int GetReserve() const { return Reserve; }
    int GetFiredCount() const { return FiredCount; }
    double GetRemaining() const { return Remaining; }
    double GetProgress() const
    {
        if (Current != Phase::Reloading && Current != Phase::Clearing) return 0;
        const double Duration = Current == Phase::Reloading ? Config.ReloadSeconds : Config.ClearSeconds;
        return std::clamp(1.0 - Remaining / Duration, 0.0, 1.0);
    }
    const Settings& GetSettings() const { return Config; }

private:
    static double Positive(double Value, double Fallback)
    {
        return std::isfinite(Value) && Value >= 0.01 ? std::min(Value, 60.0) : Fallback;
    }
    Settings Config;
    Phase Current = Phase::Ready;
    int Magazine = 0;
    int Reserve = 0;
    int FiredCount = 0;
    double Remaining = 0;
    double Cooldown = 0;
};
}
