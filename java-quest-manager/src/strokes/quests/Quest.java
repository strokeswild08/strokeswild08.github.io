package strokes.quests;

import java.util.List;
import java.util.Objects;

/** Immutable quest definitions. Runtime progress lives in QuestJournal. */
public record Quest(String id, String title, String description, List<String> requires,
                    List<Objective> objectives, Reward reward) {
    public enum Kind { COLLECT, DEFEAT, VISIT, TALK }
    public record Objective(String id, Kind kind, String target, String label, int required) {
        public Objective {
            token(id); token(target); Objects.requireNonNull(kind);
            if (label == null || label.isBlank() || required <= 0)
                throw new IllegalArgumentException("Objectives need a label and a positive count");
        }
    }
    public record Reward(int gold, int experience) {
        public Reward {
            if (gold < 0 || experience < 0) throw new IllegalArgumentException("Negative reward");
        }
    }
    public Quest {
        token(id);
        if (title == null || title.isBlank() || description == null || description.isBlank())
            throw new IllegalArgumentException("Quest title and description are required");
        requires = List.copyOf(requires); objectives = List.copyOf(objectives);
        Objects.requireNonNull(reward);
        if (objectives.isEmpty()) throw new IllegalArgumentException("Quest has no objectives");
        if (objectives.stream().map(Objective::id).distinct().count() != objectives.size())
            throw new IllegalArgumentException("Duplicate objective ID");
        if (requires.stream().distinct().count() != requires.size())
            throw new IllegalArgumentException("Duplicate prerequisite");
    }
    static void token(String value) {
        if (value == null || !value.matches("[a-z][a-z0-9_-]*"))
            throw new IllegalArgumentException("Invalid ID: " + value);
    }
}
