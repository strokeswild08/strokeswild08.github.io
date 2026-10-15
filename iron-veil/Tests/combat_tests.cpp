#include "../Source/IronVeil/Public/CombatCore.h"
#include <cstdlib>
#include <iostream>
using namespace iron;
static int checks = 0;
void check(bool value, const char* name) {
    ++checks;
    if (!value) { std::cerr << "FAIL: " << name << '\n'; std::exit(1); }
}
void advance(Combat& c, float seconds) { for (int i=0; i<int(seconds*1000); ++i) c.Tick(.001f); }
int main() {
    Combat c;
    check(c.Attack(), "ready can attack");
    check(c.stamina == 78.f, "attack spends stamina once");
    check(!c.Dodge(), "attack cannot be dodge cancelled");
    check(!c.Attack(), "cannot queue before hit window");
    int hits=0;
    for(int i=0;i<30;++i) hits+=c.Tick(.01f);
    check(hits==1, "one event per hit window");
    check(c.Attack(), "recovery accepts combo buffer");
    check(!c.Attack(), "buffer accepts one followup only");
    advance(c,.25f);
    check(c.combo==2 && c.phase==Phase::Attack, "buffer starts second attack");
    check(c.stamina==56.f, "combo followup spends stamina");
    advance(c,.3f); check(c.Attack(), "third attack buffers");
    advance(c,.3f); check(c.combo==3, "combo reaches third attack");
    advance(c,.2f); check(!c.Attack(), "combo capped at three");
    advance(c,.5f); check(c.phase==Phase::Ready, "combo ends in ready");
    Combat poor; poor.stamina=21;
    check(!poor.Attack() && !poor.Dodge() && poor.stamina==21, "insufficient stamina rejects without spending");
    Combat d; check(d.Dodge(), "dodge starts");
    check(d.Damage(10), "dodge startup remains vulnerable");
    Combat safe; safe.Dodge(); advance(safe,.1f);
    check(safe.Invulnerable() && !safe.Damage(20) && safe.health==100, "dodge iframe rejects damage");
    advance(safe,.2f);
    check(!safe.Invulnerable() && safe.Damage(20), "dodge recovery can be punished");
    Combat interrupted; interrupted.Attack(); interrupted.Damage(15); advance(interrupted,.1f);
    check(interrupted.phase==Phase::Stagger && !interrupted.Tick(.01f), "damage interrupts pending strike");
    Combat regen; regen.Dodge(); advance(regen,.6f);
    check(regen.stamina==72.f, "regen delay prevents instant refill");
    advance(regen,5); check(regen.stamina==100, "regen clamps to maximum");
    Combat dead; dead.Damage(999);
    check(!dead.Alive() && dead.health==0, "lethal damage clamps health");
    check(!dead.Attack() && !dead.Dodge() && !dead.Damage(10) && !dead.Tick(1), "dead state rejects actions");
    Combat invalid;
    check(!invalid.Damage(-1) && !invalid.Tick(-1) && invalid.health==100, "negative input is ignored");
    Combat exhausted; exhausted.Attack(); advance(exhausted,.2f); exhausted.Attack(); exhausted.stamina=0; advance(exhausted,.4f);
    check(exhausted.phase==Phase::Ready && exhausted.stamina>=0, "queued attack rechecks stamina at execution");
    std::cout << "PASS: " << checks << " combat checks\n";
}
