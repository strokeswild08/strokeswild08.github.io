#include "WeaponCore.h"
#include <functional>
#include <iostream>
#include <limits>
#include <random>
#include <stdexcept>
#include <string>

using namespace Breachline;
void Check(bool Value, const char* Message)
{
    if (!Value) throw std::runtime_error(Message);
}
void Near(double A, double B) { Check(std::abs(A - B) < 1e-8, "numeric mismatch"); }

int main()
{
    int Passed = 0;
    auto Test = [&](const char* Name, std::function<void()> Body) {
        try { Body(); ++Passed; std::cout << "PASS " << Name << '\n'; }
        catch (const std::exception& Error) { std::cerr << "FAIL " << Name << ": " << Error.what() << '\n'; std::exit(1); }
    };
    Test("initial loadout", [] {
        Weapon W; Check(W.GetMagazine() == 12 && W.GetReserve() == 60 && W.GetPhase() == Phase::Ready, "loadout");
    });
    Test("shot spends exactly one round", [] {
        Weapon W; Check(W.TryFire(.9) == Shot::Fired, "shot");
        Check(W.GetMagazine() == 11 && W.GetFiredCount() == 1 && W.GetReserve() == 60, "accounting");
    });
    Test("cooldown rejects early fire", [] {
        Weapon W; W.TryFire(.9); W.Advance(.149);
        Check(W.TryFire(.9) == Shot::Busy && W.GetMagazine() == 11, "cooldown");
        W.Advance(.001); Check(W.TryFire(.9) == Shot::Fired, "boundary");
    });
    Test("full magazine cannot reload", [] { Weapon W; Check(!W.Reload(), "full reload"); });
    Test("reload blocks fire until completion", [] {
        Weapon W; W.TryFire(.9); Check(W.Reload(), "reload start");
        W.Advance(1.79); Check(W.TryFire(.9) == Shot::Busy && W.GetMagazine() == 11, "early transfer");
        W.Advance(.01); Check(W.GetMagazine() == 12 && W.GetReserve() == 59, "transfer");
        Check(W.TryFire(.9) == Shot::Fired, "ready after reload");
    });
    Test("duplicate action cannot restart timer", [] {
        Weapon W; W.TryFire(.9); W.Reload(); W.Advance(.9);
        Check(!W.Reload() && !W.Clear() && !W.ForceJam(), "interrupt accepted"); Near(W.GetRemaining(), .9);
    });
    Test("partial reserve tops up without creating ammunition", [] {
        Settings S; S.InitialReserve = 2; Weapon W(S);
        for (int I = 0; I < 5; ++I) { W.TryFire(.9); W.Advance(.15); }
        W.Reload(); W.Advance(2); Check(W.GetMagazine() == 9 && W.GetReserve() == 0, "partial reload");
        Check(!W.Reload(), "empty reserve reload");
    });
    Test("empty chamber cannot fire or jam", [] {
        Settings S; S.Capacity = 1; S.InitialReserve = 0; Weapon W(S);
        W.TryFire(.9); W.Advance(.2); Check(W.TryFire(0) == Shot::Empty && !W.ForceJam(), "empty");
    });
    Test("stoppage keeps the round and blocks reload", [] {
        Weapon W; Check(W.TryFire(.01) == Shot::Jammed, "jam");
        Check(W.GetMagazine() == 12 && W.GetFiredCount() == 0 && !W.Reload(), "jam accounting");
        Check(W.TryFire(.9) == Shot::Jammed, "jam persists");
    });
    Test("jam threshold is strict", [] {
        Weapon W; Check(W.TryFire(.06) == Shot::Fired, "threshold");
        Settings S; S.JamProbability = 0; Weapon Clean(S); Check(Clean.TryFire(0) == Shot::Fired, "clean");
        S.JamProbability = 1; Weapon Broken(S); Check(Broken.TryFire(.999) == Shot::Jammed, "certain jam");
    });
    Test("clear action blocks fire and cannot restart", [] {
        Weapon W; Check(!W.Clear(), "clear ready"); W.ForceJam(); Check(W.Clear(), "clear start");
        W.Advance(.5); Check(!W.Clear() && !W.Reload(), "clear restart"); Near(W.GetProgress(), .5);
        Check(W.TryFire(.9) == Shot::Busy, "fire during clear"); W.Advance(.5);
        Check(W.GetPhase() == Phase::Ready && W.TryFire(.9) == Shot::Fired, "clear completion");
    });
    Test("invalid time cannot complete an action", [] {
        Weapon W; W.ForceJam(); W.Clear();
        for (double T : {-1.0, 0.0, std::numeric_limits<double>::quiet_NaN(), std::numeric_limits<double>::infinity()}) W.Advance(T);
        Near(W.GetRemaining(), 1); W.Advance(100); Check(W.GetPhase() == Phase::Ready, "large delta");
    });
    Test("invalid randomness does not mutate the weapon", [] {
        Weapon W;
        for (double R : {-1.0, 1.0, std::numeric_limits<double>::quiet_NaN(), std::numeric_limits<double>::infinity()})
            Check(W.TryFire(R) == Shot::Busy, "bad random accepted");
        Check(W.GetMagazine() == 12 && W.GetPhase() == Phase::Ready, "mutated");
    });
    Test("settings are bounded", [] {
        Settings S; S.Capacity = -50; S.InitialReserve = -10; S.ShotInterval = 0;
        S.ReloadSeconds = std::numeric_limits<double>::quiet_NaN(); S.ClearSeconds = 999; S.JamProbability = -4;
        Weapon W(S); Check(W.GetMagazine() == 1 && W.GetReserve() == 0, "capacity clamp");
        Near(W.GetSettings().ShotInterval, .15); Near(W.GetSettings().ReloadSeconds, 1.8);
        Near(W.GetSettings().ClearSeconds, 60); Near(W.GetSettings().JamProbability, 0);
    });
    Test("reset cancels pending transfer and stoppage", [] {
        Weapon W; W.TryFire(.9); W.Reload(); W.Advance(.7); W.Reset(); W.Advance(5);
        Check(W.GetMagazine() == 12 && W.GetReserve() == 60 && W.GetFiredCount() == 0, "reset reload");
        W.ForceJam(); W.Clear(); W.Reset(); Check(W.GetPhase() == Phase::Ready, "reset jam");
    });
    Test("all issued ammunition can be spent exactly once", [] {
        Settings S; S.JamProbability = 0; Weapon W(S);
        for (int I = 0; I < 72; ++I) {
            if (W.GetMagazine() == 0) { Check(W.Reload(), "reload"); W.Advance(1.8); }
            Check(W.TryFire(.5) == Shot::Fired, "shot"); W.Advance(.15);
        }
        Check(W.GetMagazine() == 0 && W.GetReserve() == 0 && W.GetFiredCount() == 72, "total");
        Check(!W.Reload() && W.TryFire(.5) == Shot::Empty, "extra round");
    });
    Test("seeded 100000-command invariant stress", [] {
        Weapon W; std::mt19937 Random(7012); std::uniform_real_distribution<double> Unit(0, 1);
        for (int I = 0; I < 100000; ++I) {
            switch (Random() % 7) {
            case 0: W.TryFire(Unit(Random)); break;
            case 1: W.Reload(); break;
            case 2: W.ForceJam(); break;
            case 3: W.Clear(); break;
            case 4: W.Reset(); break;
            default: W.Advance(Unit(Random) * 3); break;
            }
            Check(W.GetMagazine() >= 0 && W.GetMagazine() <= 12 && W.GetReserve() >= 0, "negative ammo");
            Check(W.GetMagazine() + W.GetReserve() + W.GetFiredCount() == 72, "conservation");
            Check(W.GetProgress() >= 0 && W.GetProgress() <= 1, "progress range");
        }
    });
    std::cout << Passed << " tests passed\n";
}
