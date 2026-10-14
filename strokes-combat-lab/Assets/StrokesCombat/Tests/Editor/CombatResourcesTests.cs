using NUnit.Framework;
namespace Strokes.Combat.Tests
{
    public sealed class CombatResourcesTests
    {
        [Test] public void FailedSpendDoesNotDrainOrDelayRegeneration()
        {
            var r = new CombatResources(100, 100); r.Spend(90);
            Assert.IsFalse(r.Spend(20)); Assert.AreEqual(10, r.Stamina);
            r.Tick(1, 25); Assert.That(r.Stamina, Is.EqualTo(15).Within(.001f));
        }
        [Test] public void RegenerationIsIndependentOfFramePartition()
        {
            var a = new CombatResources(100, 100); var b = new CombatResources(100, 100);
            a.Spend(50); b.Spend(50); a.Tick(2, 25);
            for (int i = 0; i < 200; i++) b.Tick(.01f, 25);
            Assert.That(a.Stamina, Is.EqualTo(b.Stamina).Within(.01f));
        }
        [Test] public void DeadActorsCannotSpendOrRegenerate()
        {
            var r = new CombatResources(100, 100); r.Spend(25); r.Damage(500); r.Tick(5, 25);
            Assert.AreEqual(0, r.Health); Assert.AreEqual(75, r.Stamina); Assert.IsFalse(r.Spend(1));
        }
        [Test] public void RegenerationNeverExceedsMaximum()
        {
            var r = new CombatResources(100, 100); r.Spend(1); r.Tick(100, 100);
            Assert.AreEqual(100, r.Stamina);
        }
        [Test] public void NegativeCostsAreRejected()
        {
            Assert.Throws<System.ArgumentOutOfRangeException>(() => new CombatResources(100, 100).Spend(-1));
        }
    }
}
