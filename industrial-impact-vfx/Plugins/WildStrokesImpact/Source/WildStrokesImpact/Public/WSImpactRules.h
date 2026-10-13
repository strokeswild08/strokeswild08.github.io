#pragma once
#include <algorithm>
#include <cmath>

namespace WSImpactRules
{
    inline float FiniteClamp(float Value, float Minimum, float Maximum, float Fallback)
    {
        return std::isfinite(Value) ? std::clamp(Value, Minimum, Maximum) : Fallback;
    }
    struct Parameters { float Intensity; float Size; };
    inline Parameters Sanitize(float Intensity, float Size)
    {
        return {FiniteClamp(Intensity, 0.25f, 2.5f, 1.0f), FiniteClamp(Size, 0.25f, 3.0f, 1.0f)};
    }
    inline bool CanSpawn(double Now, double Last, float Interval, int Active, int Limit)
    {
        if (!std::isfinite(Now) || !std::isfinite(Last) || Active < 0 || Limit < 1 || Active >= Limit) return false;
        const float Cooldown = FiniteClamp(Interval, 0.0f, 5.0f, 0.05f);
        return Now - Last >= static_cast<double>(Cooldown);
    }
}
