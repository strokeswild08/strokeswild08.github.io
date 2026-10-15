#include "WeaponCore.h"
#include <iomanip>
#include <iostream>
#include <string>

int main()
{
    Breachline::Weapon W;
    std::string Command;
    double Value;
    std::cout << std::setprecision(17);
    while (std::cin >> Command >> Value)
    {
        int Result = -1;
        if (Command == "fire") Result = static_cast<int>(W.TryFire(Value));
        else if (Command == "advance") W.Advance(Value);
        else if (Command == "reload") Result = W.Reload() ? 1 : 0;
        else if (Command == "clear") Result = W.Clear() ? 1 : 0;
        else if (Command == "jam") Result = W.ForceJam() ? 1 : 0;
        else if (Command == "reset") W.Reset();
        else return 2;
        std::cout << Result << ',' << static_cast<int>(W.GetPhase()) << ',' << W.GetMagazine() << ','
            << W.GetReserve() << ',' << W.GetFiredCount() << ',' << W.GetRemaining() << ',' << W.GetProgress() << '\n';
    }
}
