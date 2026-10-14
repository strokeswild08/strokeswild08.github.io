#pragma once
#include <array>
#include <algorithm>
#include <cmath>
#include <cstddef>

// Engine-independent policies used directly by the gameplay component.
namespace ForgeRules
{
    enum class Ability : std::size_t { Fireball, Lightning, Dash, Count };
    inline constexpr std::array<double, 3> Durations{0.8, 2.5, 1.6};
    inline bool Valid(Ability Kind) { return static_cast<std::size_t>(Kind) < Durations.size(); }
    struct Cooldowns
    {
        std::array<double, 3> ReadyAt{};
        double Remaining(Ability Kind, double Now) const
        {
            if (!Valid(Kind) || !std::isfinite(Now) || Now < 0.0) return -1.0;
            return std::max(0.0, ReadyAt[static_cast<std::size_t>(Kind)] - Now);
        }
        bool CanCast(Ability Kind, double Now) const { return Remaining(Kind, Now) == 0.0; }
        bool Commit(Ability Kind, double Now)
        {
            if (!CanCast(Kind, Now)) return false;
            const auto Index = static_cast<std::size_t>(Kind);
            ReadyAt[Index] = Now + Durations[Index];
            return true;
        }
        void Reset() { ReadyAt.fill(0.0); }
    };
    inline double BlastDamage(double Distance, double Radius, double Base)
    {
        if (!std::isfinite(Distance) || !std::isfinite(Radius) || !std::isfinite(Base) || Distance < 0.0 || Radius <= 0.0 || Base <= 0.0 || Distance > Radius) return 0.0;
        return Base * (1.0 - 0.75 * Distance / Radius);
    }
    inline double DashStep(double Delta, double RemainingTime, double Distance = 600.0, double Duration = 0.22)
    {
        if (!std::isfinite(Delta) || !std::isfinite(RemainingTime) || !std::isfinite(Distance) || !std::isfinite(Duration) || Delta <= 0 || RemainingTime <= 0 || Distance <= 0 || Duration <= 0) return 0;
        return std::min(Delta, RemainingTime) * Distance / Duration;
    }
    enum class Surface { Stone, Metal, Glass };
    inline Surface RouteSurface(int Value)
    {
        return Value == 1 ? Surface::Metal : (Value == 3 ? Surface::Glass : Surface::Stone);
    }
}
