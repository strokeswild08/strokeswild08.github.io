package strokes.quests;

import java.util.List;
import static strokes.quests.Quest.Kind.*;

public final class Catalog {
    private Catalog() {}
    public static List<Quest> demo() {
        return List.of(
            new Quest("supplies", "Before the rain", "Mara's lantern is running low. Gather three bundles of reed and check the old footbridge before the storm arrives.",
                List.of(), List.of(new Quest.Objective("reeds", COLLECT, "reed", "Gather reed bundles", 3),
                    new Quest.Objective("bridge", VISIT, "bridge", "Inspect the footbridge", 1)), new Quest.Reward(40, 80)),
            new Quest("wolves", "Tracks by the mill", "Two wolves have been circling the mill. Clear the path so the night courier can pass.",
                List.of(), List.of(new Quest.Objective("wolves", DEFEAT, "wolf", "Drive off wolves", 2)), new Quest.Reward(65, 120)),
            new Quest("beacon", "A light on the ridge", "With the lantern repaired, take it to the ridge and tell Mara the beacon is burning again.",
                List.of("supplies"), List.of(new Quest.Objective("ridge", VISIT, "ridge", "Reach the ridge", 1),
                    new Quest.Objective("mara", TALK, "mara", "Report to Mara", 1)), new Quest.Reward(90, 160)),
            new Quest("courier", "The last crossing", "The mill road is clear and the beacon is lit. Meet the courier at the footbridge to close the route.",
                List.of("wolves", "beacon"), List.of(new Quest.Objective("courier", TALK, "courier", "Meet the courier", 1)), new Quest.Reward(140, 240)));
    }
}
