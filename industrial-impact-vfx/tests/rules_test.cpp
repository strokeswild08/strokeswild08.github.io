#include "../Plugins/WildStrokesImpact/Source/WildStrokesImpact/Public/WSImpactRules.h"
#include <cassert>
#include <iostream>
#include <limits>
int main()
{
    using namespace WSImpactRules;
    const float Nan = std::numeric_limits<float>::quiet_NaN();
    const float Inf = std::numeric_limits<float>::infinity();
    auto Values = Sanitize(Nan, Inf); assert(Values.Intensity == 1.0f && Values.Size == 1.0f);
    Values = Sanitize(-1.0f, 100.0f); assert(Values.Intensity == 0.25f && Values.Size == 3.0f);
    Values = Sanitize(2.0f, 0.5f); assert(Values.Intensity == 2.0f && Values.Size == 0.5f);
    assert(CanSpawn(1.0, 0.0, 0.05f, 0, 8));
    assert(!CanSpawn(1.0, 1.0, 0.05f, 0, 8));
    assert(!CanSpawn(1.0, 0.0, 0.05f, 8, 8));
    assert(!CanSpawn(1.0, 0.0, 0.05f, -1, 8));
    assert(!CanSpawn(1.0, 0.0, 0.05f, 0, 0));
    assert(!CanSpawn(Nan, 0.0, 0.05f, 0, 8));
    assert(!CanSpawn(1.0, Inf, 0.05f, 0, 8));
    assert(!CanSpawn(0.0, 1.0, 0.0f, 0, 8));
    assert(CanSpawn(0.0, 0.0, 0.0f, 0, 8));
    assert(!CanSpawn(0.02, 0.0, Nan, 0, 8));
    assert(FiniteClamp(Inf, 0.0f, 1.0f, 0.5f) == 0.5f);
    for (int i = -100; i <= 100; ++i)
    {
        const auto P = Sanitize(i * 0.1f, i * 0.1f);
        assert(P.Intensity >= 0.25f && P.Intensity <= 2.5f);
        assert(P.Size >= 0.25f && P.Size <= 3.0f);
    }
    std::cout << "Portable rules checks passed, including 201 clamp samples. UE runtime is not compiled by this test.\n";
}
