#pragma once
#include <algorithm>
#include <cmath>

// Engine-independent rules. Used directly by the Unreal character and native tests.
namespace iron {
enum class Phase { Ready, Attack, Dodge, Stagger, Dead };
struct Rules {
    float maxHealth = 100.f, maxStamina = 100.f;
    float attackCost = 22.f, dodgeCost = 28.f, regen = 24.f;
    float windup = .18f, recovery = .34f, dodgeDuration = .40f;
    float invulnerableStart = .04f, invulnerableEnd = .27f;
};
class Combat {
public:
    Rules rules;
    float health = 100.f, stamina = 100.f, elapsed = 0.f, regenDelay = 0.f;
    Phase phase = Phase::Ready;
    int combo = 0;
    bool queued = false, hitSent = false;

    bool Alive() const { return phase != Phase::Dead; }
    bool Invulnerable() const {
        return phase == Phase::Dodge && elapsed >= rules.invulnerableStart && elapsed < rules.invulnerableEnd;
    }
    bool Attack() {
        if (phase == Phase::Attack) {
            if (elapsed >= rules.windup && combo < 3 && !queued) { queued = true; return true; }
            return false;
        }
        if (phase != Phase::Ready || stamina < rules.attackCost) return false;
        BeginAttack(1); return true;
    }
    bool Dodge() {
        if (phase != Phase::Ready || stamina < rules.dodgeCost) return false;
        stamina -= rules.dodgeCost; regenDelay = .8f; elapsed = 0.f;
        phase = Phase::Dodge; queued = false; return true;
    }
    bool Damage(float amount) {
        if (!Alive() || Invulnerable() || !std::isfinite(amount) || amount <= 0.f) return false;
        health = std::max(0.f, health - amount); queued = false; elapsed = 0.f;
        phase = health <= 0.f ? Phase::Dead : Phase::Stagger;
        return true;
    }
    // Returns one hit-window event per attack. Caller supplies short simulation steps.
    bool Tick(float dt) {
        if (!std::isfinite(dt) || dt <= 0.f || !Alive()) return false;
        regenDelay = std::max(0.f, regenDelay - dt);
        if (phase == Phase::Ready && regenDelay <= 0.f)
            stamina = std::min(rules.maxStamina, stamina + rules.regen * dt);
        elapsed += dt;
        bool hit = false;
        if (phase == Phase::Attack) {
            if (!hitSent && elapsed >= rules.windup) { hitSent = true; hit = true; }
            if (elapsed >= rules.windup + rules.recovery) {
                if (queued && stamina >= rules.attackCost) BeginAttack(combo + 1);
                else { phase = Phase::Ready; queued = false; }
            }
        } else if ((phase == Phase::Dodge && elapsed >= rules.dodgeDuration) ||
                   (phase == Phase::Stagger && elapsed >= .28f)) {
            phase = Phase::Ready;
        }
        return hit;
    }
private:
    void BeginAttack(int index) {
        stamina -= rules.attackCost; regenDelay = .8f;
        combo = index; phase = Phase::Attack; elapsed = 0.f; queued = false; hitSent = false;
    }
};
}
