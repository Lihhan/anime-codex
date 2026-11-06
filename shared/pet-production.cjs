// Shared production contract: four columns, four action rows per sheet.
const sheets = [
  {
    id: "daily",
    actions: ["idle", "read", "meal", "sleep"],
    direction:
      "idle standing with gentle breathing; seated reading and turning a page; seated eating at a low table; curled or lying down peacefully asleep",
  },
  {
    id: "play",
    actions: ["gaming", "office", "pet", "attention"],
    direction:
      "playing a handheld game, typing at a small desk, happy head-pat response, listening",
  },
  {
    id: "run",
    actions: ["walk_right", "walk_left", "walk_up", "walk_down"],
    direction:
      "four-frame locomotion cycles facing right, left, back, front respectively",
  },
  {
    id: "exit",
    actions: ["exit_read", "exit_meal", "exit_gaming", "exit_office"],
    direction:
      "four sequential frames per row putting away the book, food, game console, desk, ending at neutral standing; props disappear only after being put away",
  },
  {
    id: "enter",
    actions: ["enter_read", "enter_meal", "enter_gaming", "enter_office"],
    direction:
      "four sequential frames per row starting from neutral standing, catching a book falling from above then opening it; bringing food onto a low table and sitting; taking out a game console and sitting; pulling up a chair and sitting at the desk. Each row must have distinct physical poses, continuous hand/prop trajectories and a final pose matching the daily/play loop",
  },
  {
    id: "change",
    actions: ["enter_sleep", "exit_sleep", "enter_walk", "exit_walk"],
    direction:
      "physically kneeling then curling down to sleep; waking from a lying pose then pushing up with palms, kneeling and rising; leaning forward then stepping into a run; slowing with planted feet and settling upright. No fades, repeated idle poses, camera movement or props teleporting",
  },
  {
    id: "social",
    actions: ["enter_pet", "exit_pet", "enter_attention", "exit_attention"],
    direction: "from neutral standing lean head toward a headpat and smile; finish headpat, straighten hat and return to neutral; turn to viewer, clasp hands and lean to listen; straighten, nod and release hands to neutral. Four physical consecutive poses per row, matching play-sheet headpat/listening poses, no fades or repeated idle images",
  },
];
function makePack(files) {
  const clips = {};
  for (const sheet of sheets)
    sheet.actions.forEach((action, row) => {
      clips[action] = {
        src: files[sheet.id],
        row,
        durations: Array(4).fill(
          action.startsWith("walk_")
            ? 130
            : /^(enter|exit)_/.test(action)
              ? 140
              : action === "idle"
                ? 900
                : 500,
        ),
      };
    });
  clips.eat = { ...clips.meal };
  clips.working = { ...clips.office };
  return { columns: 4, rows: 4, aspect: 1, clips };
}
module.exports = { sheets, makePack };
