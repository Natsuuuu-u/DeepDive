# Deep Dive Trivia

Personal, free, offline-first rare-answer trivia game with a pixel-art deep-sea theme.
React + Vite + TypeScript + Tailwind CSS 3 + Framer Motion + Lucide + React Router.

## Run

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # typecheck + production build
npm run verify     # logic checks: spelling, dive math, ocean blending
```

## Structure

```
src/
  components/
    layout/   AppShell, Navigation
    ocean/    OceanBackground, DivingCharacter, DepthIndicator, GameStage
    game/     GameHeader, Timer, QuestionCard, AnswerInput, ResultsScreen, GamePreview
    ui/       PixelButton, PixelPanel, PageTitle
  pages/      Home, DailyDive, Unlimited, Archive, game records, archived practice, Statistics, Settings
  lib/        depth zones, rarity tiers, answer matching, daily dates, questions, progression, storage
  hooks/      deadline timer, countdown, local storage, trivia game
  context/    SettingsContext
  data/       validated TypeScript question banks
  types/      shared types
```

## Gameplay

Daily Dive selects seven unique questions deterministically from the user's local
calendar date. Its schedule, active deadline, completed result, and streak are saved
locally; a completed daily challenge can be reviewed but not scored again. Unlimited
games choose seven random questions and avoid recent completed runs when possible.
Archived daily challenges can be replayed as practice without changing the daily streak.

Completed dives and answer-by-answer results are kept in the local archive. Question
answer aliases and rarity points are defined in the TypeScript question banks under
`src/data/questionBanks/`.

Each rarity point represents 10 metres. The existing diver, depth indicator, and
underwater zone transitions respond to the cumulative score. Each question has a
deadline-based 25-second timer that continues correctly after refreshing the page.

Completed results include a final descent, per-question accepted-answer reveals,
and shareable summaries. Statistics, rarity counts, daily streaks, and achievements
are derived from completed dives and persisted locally. Game records retain question
snapshots so archived reviews remain available if the question bank changes.

## Dive animation

A correct answer starts a four-phase dive (confirm, prepare, descend, arrive) whose
distance is exactly `points x 10` metres, from the previous depth to the new one.
Each rarity has its own timing and intensity (`src/lib/dive.ts`): Plankton ~2.6s up to
One in a Krillion ~6.3s with a cinematic sequence (sunburst, shockwaves, letterbox bars,
spark burst, golden krill). The animation is a pure function of the wall clock, so
refreshing mid-dive resumes in place and never repeats a reward. The next question
appears only after the dive; a Skip button (or Esc) ends it early. Reduced motion
(the in-app setting or the OS preference) gives a short, still confirmation.

The ocean is driven by a continuous depth value (`src/lib/ocean.ts`): water colour,
darkness, sunbeams and three parallax scenery layers cross-fade smoothly around each
zone boundary instead of swapping backgrounds.

## Answer checking

`evaluateAnswer` (`src/lib/answers.ts`) ignores case, spacing, punctuation and
accents, and uses Damerau-Levenshtein distance with thresholds that scale with answer
length (answers of four letters or fewer must match exactly; numbers are never fuzzy).
Outcomes: exact/alias match; high-confidence unambiguous typo (accepted, keeps the
answer's own rarity); uncertain typo (asks "Did you mean...?", no points until
confirmed); or rejected. Any text that is a valid answer to some other question is
never treated as a typo.
