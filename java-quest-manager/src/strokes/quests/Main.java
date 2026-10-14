package strokes.quests;

import java.nio.file.Path;
import java.util.Scanner;

public final class Main {
    public static void main(String[] args) {
        if (args.length > 0 && args[0].equals("--gui")) {
            javax.swing.SwingUtilities.invokeLater(() -> new JournalWindow().setVisible(true));
            return;
        }
        QuestJournal journal = new QuestJournal(Catalog.demo());
        Path save = Path.of("saves", "journal.properties");
        System.out.println("TRAIL LEDGER / Wild Strokes\nA quest journal for the road home. Type help to begin.");
        try (Scanner input = new Scanner(System.in)) {
            while (true) {
                System.out.print("ledger> ");
                if (!input.hasNextLine()) break;
                String line = input.nextLine().trim();
                if (line.isEmpty()) continue;
                String[] words = line.split("\\s+");
                try {
                    switch (words[0]) {
                        case "help" -> System.out.println("list | accept ID | event KIND TARGET [COUNT] | claim ID | wallet | save | load | quit\nKinds: collect, defeat, visit, talk. Targets: reed, bridge, wolf, ridge, mara, courier.");
                        case "list" -> {
                            for (var v : journal.views()) {
                                System.out.printf("%s / %s [%s]%n  %s%n", v.quest().id(), v.quest().title(), v.status(), v.quest().description());
                                for (var o : v.quest().objectives())
                                    System.out.printf("  %s: %d/%d%n", o.label(), v.progress().get(o.id()), o.required());
                            }
                        }
                        case "accept" -> { require(words, 2); journal.accept(words[1]); System.out.println("Quest accepted."); }
                        case "event" -> {
                            if (words.length < 3 || words.length > 4) throw new IllegalArgumentException("Use event KIND TARGET [COUNT]");
                            var changed = journal.record(new QuestJournal.Event(Quest.Kind.valueOf(words[1].toUpperCase(java.util.Locale.ROOT)), words[2], words.length == 4 ? Integer.parseInt(words[3]) : 1));
                            System.out.println(changed.isEmpty() ? "No active objective matched." : "Updated: " + String.join(", ", changed));
                        }
                        case "claim" -> { require(words, 2); var r = journal.claim(words[1]); System.out.printf("Reward: +%d gold, +%d XP%n", r.gold(), r.experience()); }
                        case "wallet" -> System.out.printf("%d gold / %d XP%n", journal.gold(), journal.experience());
                        case "save" -> { JournalStore.save(journal, save); System.out.println("Journal saved."); }
                        case "load" -> { JournalStore.load(journal, save); System.out.println("Journal restored."); }
                        case "quit" -> { return; }
                        default -> System.out.println("Unknown command. Type help.");
                    }
                } catch (Exception e) { System.out.println("Could not do that: " + e.getMessage()); }
            }
        }
    }
    private static void require(String[] words, int count) {
        if (words.length != count) throw new IllegalArgumentException("Expected a quest ID");
    }
}
