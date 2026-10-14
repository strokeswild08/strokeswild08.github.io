package strokes.quests;

import javax.swing.*;
import javax.swing.border.EmptyBorder;
import java.awt.*;
import java.nio.file.Path;

/** Desktop demo adapter. The journal itself does not depend on Swing. */
public final class JournalWindow extends JFrame {
    private static final Color INK = new Color(25, 36, 35), PAPER = new Color(244, 239, 224);
    private final QuestJournal journal = new QuestJournal(Catalog.demo());
    private final DefaultListModel<String> rows = new DefaultListModel<>();
    private final JList<String> list = new JList<>(rows);
    private final JPanel detail = new JPanel();
    private final JLabel wallet = new JLabel(), message = new JLabel("Choose a job from the noticeboard.");
    private final Path save = Path.of("saves", "journal.properties");

    public JournalWindow() {
        super("Trail Ledger / Wild Strokes");
        setDefaultCloseOperation(WindowConstants.EXIT_ON_CLOSE);
        setSize(1040, 700); setMinimumSize(new Dimension(860, 600)); setLocationRelativeTo(null);
        JPanel root = new JPanel(new BorderLayout(20, 20)); root.setBackground(PAPER);
        root.setBorder(new EmptyBorder(28, 28, 24, 28)); setContentPane(root);
        JPanel header = new JPanel(new BorderLayout()); header.setOpaque(false);
        JPanel branding = new JPanel(new GridLayout(2, 1)); branding.setOpaque(false);
        JLabel title = new JLabel("TRAIL LEDGER"); title.setFont(new Font("Serif", Font.BOLD, 32)); title.setForeground(INK);
        branding.add(title); branding.add(new JLabel("WILD STROKES  /  A JOURNAL FOR THE ROAD HOME"));
        header.add(branding, BorderLayout.WEST); wallet.setFont(new Font("Monospaced", Font.BOLD, 16));
        header.add(wallet, BorderLayout.EAST); root.add(header, BorderLayout.NORTH);
        list.setFont(new Font("SansSerif", Font.PLAIN, 15)); list.setFixedCellHeight(54);
        list.setBackground(new Color(228, 223, 207)); list.setSelectionBackground(INK);
        list.setSelectionForeground(PAPER); list.setSelectionMode(ListSelectionModel.SINGLE_SELECTION);
        list.addListSelectionListener(e -> { if (!e.getValueIsAdjusting()) showQuest(); });
        detail.setLayout(new BoxLayout(detail, BoxLayout.Y_AXIS)); detail.setBackground(PAPER);
        detail.setBorder(new EmptyBorder(8, 20, 8, 8));
        JSplitPane split = new JSplitPane(JSplitPane.HORIZONTAL_SPLIT, new JScrollPane(list), new JScrollPane(detail));
        split.setDividerLocation(320); split.setBorder(null); root.add(split, BorderLayout.CENTER);
        JPanel bottom = new JPanel(new BorderLayout(12, 12)); bottom.setOpaque(false);
        JPanel events = new JPanel(new GridLayout(2, 3, 8, 8)); events.setOpaque(false);
        action(events, "Gather reed", () -> event(Quest.Kind.COLLECT, "reed"));
        action(events, "Visit bridge", () -> event(Quest.Kind.VISIT, "bridge"));
        action(events, "Defeat wolf", () -> event(Quest.Kind.DEFEAT, "wolf"));
        action(events, "Visit ridge", () -> event(Quest.Kind.VISIT, "ridge"));
        action(events, "Talk to Mara", () -> event(Quest.Kind.TALK, "mara"));
        action(events, "Meet courier", () -> event(Quest.Kind.TALK, "courier"));
        JPanel saveButtons = new JPanel(new GridLayout(2, 1, 8, 8)); saveButtons.setOpaque(false);
        action(saveButtons, "Save journal", () -> { JournalStore.save(journal, save); return "Saved to " + save; });
        action(saveButtons, "Load journal", () -> { JournalStore.load(journal, save); return "Journal restored."; });
        bottom.add(events, BorderLayout.CENTER); bottom.add(saveButtons, BorderLayout.EAST);
        message.setBorder(new EmptyBorder(10, 0, 0, 0)); bottom.add(message, BorderLayout.SOUTH);
        root.add(bottom, BorderLayout.SOUTH); refresh(); list.setSelectedIndex(0);
    }
    private String event(Quest.Kind kind, String target) {
        var changes = journal.record(new QuestJournal.Event(kind, target, 1));
        return changes.isEmpty() ? "No active quest needs that event. Accept a job first." : "Progress recorded: " + String.join(", ", changes);
    }
    @FunctionalInterface private interface Command { String run() throws Exception; }
    private void action(JPanel panel, String label, Command command) {
        JButton button = new JButton(label); button.setFocusPainted(false);
        button.setFont(new Font("SansSerif", Font.BOLD, 13));
        button.addActionListener(e -> {
            try { message.setText(command.run()); refresh(); }
            catch (Exception ex) { message.setText(ex.getMessage()); }
        }); panel.add(button);
    }
    private void refresh() {
        int selected = list.getSelectedIndex(); rows.clear();
        for (var v : journal.views()) rows.addElement("  " + v.quest().title() + "  /  " + v.status());
        list.setSelectedIndex(Math.max(0, selected));
        wallet.setText(journal.gold() + " GOLD   /   " + journal.experience() + " XP"); showQuest();
    }
    private void showQuest() {
        detail.removeAll(); int index = list.getSelectedIndex();
        if (index < 0) { detail.revalidate(); detail.repaint(); return; }
        var view = journal.views().get(index); Quest q = view.quest();
        JLabel state = new JLabel(view.status().name() + "  /  " + q.id()); state.setForeground(new Color(112, 84, 46));
        detail.add(state); detail.add(Box.createVerticalStrut(16));
        JLabel title = new JLabel(q.title()); title.setFont(new Font("Serif", Font.BOLD, 28)); detail.add(title);
        JTextArea text = new JTextArea(q.description()); text.setFont(new Font("SansSerif", Font.PLAIN, 15));
        text.setLineWrap(true); text.setWrapStyleWord(true); text.setEditable(false); text.setOpaque(false);
        text.setBorder(new EmptyBorder(16, 0, 20, 0)); text.setMaximumSize(new Dimension(Integer.MAX_VALUE, 120));
        detail.add(text);
        for (var objective : q.objectives()) {
            int done = view.progress().get(objective.id());
            detail.add(new JLabel(objective.label() + "   " + done + " / " + objective.required()));
            JProgressBar bar = new JProgressBar(0, objective.required()); bar.setValue(done);
            bar.setForeground(new Color(61, 109, 91)); bar.setMaximumSize(new Dimension(Integer.MAX_VALUE, 10));
            detail.add(Box.createVerticalStrut(7)); detail.add(bar); detail.add(Box.createVerticalStrut(18));
        }
        detail.add(new JLabel("Reward   " + q.reward().gold() + " gold  /  " + q.reward().experience() + " XP"));
        detail.add(Box.createVerticalStrut(20));
        JPanel controls = new JPanel(new FlowLayout(FlowLayout.LEFT, 0, 0)); controls.setOpaque(false);
        switch (view.status()) {
            case AVAILABLE -> action(controls, "Accept this job", () -> { journal.accept(q.id()); return "Accepted: " + q.title(); });
            case READY -> action(controls, "Collect reward", () -> { journal.claim(q.id()); return "Reward collected. Check the noticeboard for new jobs."; });
            case LOCKED -> controls.add(new JLabel("First claim: " + String.join(", ", q.requires())));
            case ACTIVE -> controls.add(new JLabel("Use the event buttons below to advance this job."));
            case CLAIMED -> controls.add(new JLabel("Job complete. Reward already collected."));
        }
        detail.add(controls); detail.add(Box.createVerticalGlue()); detail.revalidate(); detail.repaint();
    }
}
