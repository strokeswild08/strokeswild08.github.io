#include "../Source/AbilityForge/Public/ForgeRules.h"
#include <cstdlib>
#include <iostream>
#include <limits>

int Checks = 0;
void Require(bool Condition, const char* Label)
{
    ++Checks;
    if (!Condition) { std::cerr << "FAIL: " << Label << '\n'; std::exit(1); }
}
bool Near(double A, double B) { return std::abs(A-B) < 1e-8; }
int main()
{
    using namespace ForgeRules;
    const double NaN = std::numeric_limits<double>::quiet_NaN();
    const double Inf = std::numeric_limits<double>::infinity();
    Cooldowns State;
    Require(State.CanCast(Ability::Fireball,0),"Initial fireball ready");
    Require(State.Commit(Ability::Fireball,0),"First fireball accepted");
    Require(!State.Commit(Ability::Fireball,0.79),"No early repeat");
    Require(Near(State.Remaining(Ability::Fireball,0.3),0.5),"Cooldown reports remaining time");
    Require(State.Commit(Ability::Lightning,0.1),"Other ability remains independent");
    Require(State.Commit(Ability::Dash,0.2),"Dash remains independent");
    Require(State.Commit(Ability::Fireball,0.8),"Exact boundary accepted");
    Require(!State.Commit(Ability::Count,10),"Invalid ability rejected");
    Require(!State.Commit(Ability::Dash,NaN),"NaN time rejected");
    Require(!State.Commit(Ability::Dash,Inf),"Infinite time rejected");
    Require(!State.Commit(Ability::Dash,-1),"Negative time rejected");
    Require(!State.CanCast(Ability::Count,0),"Invalid cooldown cannot become ready");
    State.Reset();
    Require(State.CanCast(Ability::Fireball,0) && State.CanCast(Ability::Dash,0),"Reset clears every cooldown");
    for (int Cycle=0;Cycle<1000;++Cycle)
    {
        const double Now = Cycle*3.0;
        Require(State.Commit(Ability::Lightning,Now),"Repeated scheduled cast accepted");
        Require(!State.Commit(Ability::Lightning,Now+2.49),"Scheduled cast cannot bypass cooldown");
    }
    Require(Near(BlastDamage(0,260,60),60),"Blast center full damage");
    Require(Near(BlastDamage(130,260,60),37.5),"Blast middle falloff");
    Require(Near(BlastDamage(260,260,60),15),"Blast edge minimum damage");
    Require(BlastDamage(261,260,60)==0,"Outside radius no damage");
    Require(BlastDamage(-1,260,60)==0,"Negative distance rejected");
    Require(BlastDamage(NaN,260,60)==0,"Invalid distance rejected");
    Require(BlastDamage(0,0,60)==0,"Zero radius rejected");
    Require(BlastDamage(0,260,Inf)==0,"Infinite damage rejected");
    double Previous = 60;
    for (int Distance=1;Distance<=260;++Distance)
    {
        const double Damage = BlastDamage(Distance,260,60);
        Require(Damage<=Previous && Damage>=15,"Damage monotonic inside radius");
        Previous=Damage;
    }
    for (const double Rate : {30.0,60.0,144.0})
    {
        double Remaining=0.22,Travel=0;
        while (Remaining>0) { Travel+=DashStep(1.0/Rate,Remaining); Remaining=std::max(0.0,Remaining-1.0/Rate); }
        Require(Near(Travel,600),"Dash time policy frame rate independent");
    }
    Require(Near(DashStep(1.0,0.22),600),"Long frame bounded to remaining dash");
    Require(DashStep(0.01,0)==0,"Finished dash cannot move");
    Require(DashStep(-1,0.22)==0,"Negative frame rejected");
    Require(DashStep(NaN,0.22)==0,"Invalid frame rejected");
    Require(DashStep(0.01,0.22,600,0)==0,"Zero duration rejected");
    Require(RouteSurface(1)==Surface::Metal,"Metal routed");
    Require(RouteSurface(3)==Surface::Glass,"Glass routed");
    Require(RouteSurface(2)==Surface::Stone && RouteSurface(99)==Surface::Stone,"Stone is safe default");
    std::cout << Checks << " portable C++ policy checks passed; Unreal module not compiled.\n";
}
