# Dartsapp Broadcast UI Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Upgrade the darts planner to a broadcast-style responsive UI and change the match screen so both available boards are shown at once.

**Architecture:** Keep the current no-framework app structure, but isolate the new board/live-selection logic into a small shared helper module that can be tested with Node. Then update the DOM structure and styles in place so the existing state machine, standings flow, and score entry behavior remain intact.

**Tech Stack:** Static HTML, vanilla CSS, vanilla browser JavaScript, Node built-in test runner

---

## File Structure

- Create: `match-board-utils.js`
- Create: `tests/match-board-utils.test.js`
- Modify: `index.html`
- Modify: `app.js`
- Modify: `styles.css`

### Task 1: Extract and test board-slot selection logic

**Files:**
- Create: `match-board-utils.js`
- Create: `tests/match-board-utils.test.js`
- Modify: `index.html`
- Modify: `app.js`

- [ ] **Step 1: Write the failing test**

```js
const test = require("node:test");
const assert = require("node:assert/strict");
const {
  getBoardLiveSlots,
  getNextPendingMatchByBoard
} = require("../match-board-utils.js");

test("getNextPendingMatchByBoard returns the earliest unfinished match for a board", () => {
  const matches = [
    { id: "m1", board: 1, status: "done", phase: "pool", roundName: "Poule A" },
    { id: "m2", board: 1, status: "planned", phase: "pool", roundName: "Poule A" },
    { id: "m3", board: 1, status: "planned", phase: "semi", roundName: "Halve finale 1" }
  ];

  assert.equal(getNextPendingMatchByBoard(matches, 1).id, "m2");
});

test("getBoardLiveSlots returns one slot per board and keeps empty slots explicit", () => {
  const matches = [
    { id: "m1", board: 1, status: "planned", phase: "pool", roundName: "Poule A" },
    { id: "m2", board: 2, status: "done", phase: "pool", roundName: "Poule A" }
  ];

  const slots = getBoardLiveSlots(matches, 2);

  assert.equal(slots.length, 2);
  assert.equal(slots[0].board, 1);
  assert.equal(slots[0].match.id, "m1");
  assert.equal(slots[1].board, 2);
  assert.equal(slots[1].match, null);
  assert.equal(slots[1].state, "idle");
});

test("getBoardLiveSlots prefers unfinished matches over completed history on the same board", () => {
  const matches = [
    { id: "m1", board: 2, status: "done", phase: "pool", roundName: "Poule A" },
    { id: "m2", board: 2, status: "planned", phase: "pool", roundName: "Poule B" }
  ];

  const slots = getBoardLiveSlots(matches, 2);

  assert.equal(slots[1].match.id, "m2");
  assert.equal(slots[1].state, "pending");
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test tests/match-board-utils.test.js`

Expected: FAIL with `Cannot find module '../match-board-utils.js'` or missing export errors.

- [ ] **Step 3: Write minimal implementation**

```js
(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) {
    module.exports = api;
  }
  root.DartsMatchBoardUtils = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  const phaseOrder = {
    pool: 1,
    tiebreak: 2,
    semi: 3,
    final: 4
  };

  function compareMatches(a, b) {
    return (
      (phaseOrder[a.phase] || 99) - (phaseOrder[b.phase] || 99) ||
      (a.board || 0) - (b.board || 0) ||
      String(a.roundName || "").localeCompare(String(b.roundName || "")) ||
      String(a.id || "").localeCompare(String(b.id || ""))
    );
  }

  function getNextPendingMatchByBoard(matches, board) {
    return [...matches]
      .filter((match) => match.board === board && match.status !== "done")
      .sort(compareMatches)[0] || null;
  }

  function getBoardLiveSlots(matches, boardCount) {
    return Array.from({ length: boardCount }, (_, index) => {
      const board = index + 1;
      const match = getNextPendingMatchByBoard(matches, board);
      return {
        board,
        match,
        state: match ? "pending" : "idle"
      };
    });
  }

  return {
    compareMatches,
    getNextPendingMatchByBoard,
    getBoardLiveSlots
  };
});
```

- [ ] **Step 4: Load the helper in the app shell**

Add this before the existing app script in `index.html`:

```html
    <script src="match-board-utils.js"></script>
    <script src="app.js"></script>
```

- [ ] **Step 5: Wire the helper into `app.js` without changing behavior yet**

Add this near the top of `app.js` after `phaseOrder`:

```js
  const boardUtils = window.DartsMatchBoardUtils;
```

Replace `orderedMatches()` with:

```js
  function orderedMatches() {
    return [...state.matches].sort(boardUtils.compareMatches);
  }
```

- [ ] **Step 6: Run test to verify it passes**

Run: `node --test tests/match-board-utils.test.js`

Expected: PASS

- [ ] **Step 7: Commit**

```bash
git add match-board-utils.js tests/match-board-utils.test.js index.html app.js
git commit -m "test: add board slot selection helpers"
```

If `git` is unavailable in this workspace, skip the commit and continue.

### Task 2: Replace single live state with a two-board live strip

**Files:**
- Modify: `index.html`
- Modify: `app.js`
- Test: `tests/match-board-utils.test.js`

- [ ] **Step 1: Extend the test with a scoreboard-oriented slot case**

Append this test:

```js
test("getBoardLiveSlots can show both boards at once when both have pending matches", () => {
  const matches = [
    { id: "m1", board: 1, status: "planned", phase: "pool", roundName: "Poule A" },
    { id: "m2", board: 2, status: "planned", phase: "pool", roundName: "Poule B" }
  ];

  const slots = getBoardLiveSlots(matches, 2);

  assert.equal(slots[0].match.id, "m1");
  assert.equal(slots[1].match.id, "m2");
});
```

- [ ] **Step 2: Run test to verify the suite still passes before UI refactor**

Run: `node --test tests/match-board-utils.test.js`

Expected: PASS

- [ ] **Step 3: Replace the matches action header in `index.html`**

Change the matches section header from:

```html
          <div class="section-heading">
            <div>
              <p class="eyebrow">Stap 3</p>
              <h2>Wedstrijden</h2>
            </div>
            <div class="button-row">
              <button id="nextLiveBtn" class="secondary-button" type="button">Volgende live</button>
            </div>
          </div>
          <div id="livePanel" class="live-panel"></div>
```

to:

```html
          <div class="section-heading">
            <div>
              <p class="eyebrow">Stap 3</p>
              <h2>Wedstrijden</h2>
            </div>
          </div>
          <div id="livePanel" class="live-strip"></div>
```

- [ ] **Step 4: Remove the old single-live button wiring and state resets**

In `app.js`:

- remove `liveMatchId` from `defaultState()`
- remove `state.liveMatchId = null;` resets
- remove the `nextLiveBtn` event listener
- remove `document.getElementById("nextLiveBtn").disabled = !isAdmin();`
- remove `nextUnfinishedMatch()` entirely if no callers remain

Minimal target shape for `defaultState()`:

```js
    return {
      id: crypto.randomUUID ? crypto.randomUUID() : String(Date.now()),
      role: "admin",
      stage: "setup",
      name: "Vrijdagavond Darts",
      playerCount: 8,
      mode: "pool-knockout",
      teamMode: "single",
      poolCount: 2,
      legsTarget: 3,
      players: demoPlayers.slice(0, 8),
      teams: [],
      pools: [],
      matches: [],
      updatedAt: Date.now()
    };
```

- [ ] **Step 5: Implement the live strip renderer**

Replace the top of `renderMatches()` with:

```js
  function renderMatches() {
    const liveSlots = boardUtils.getBoardLiveSlots(orderedMatches(), boardCount);

    els.livePanel.innerHTML = `
      ${liveSlots.map((slot) => renderLiveBoardSlot(slot)).join("")}
    `;

    if (!state.matches.length) {
      els.matchSections.innerHTML = "<div class=\"panel\"><p class=\"muted\">Na de loting verschijnen hier de wedstrijden.</p></div>";
      return;
    }

    const preview = bracketPreview();
```

Add a new helper nearby:

```js
  function renderLiveBoardSlot(slot) {
    if (!slot.match) {
      return `
        <article class="live-board-card idle">
          <span class="status">Bord ${slot.board}</span>
          <div class="match-title">Geen open wedstrijd</div>
          <div class="match-meta">Dit bord heeft op dit moment geen geplande partij meer.</div>
        </article>
      `;
    }

    return `
      <article class="live-board-card">
        <span class="status live">Bord ${slot.board}</span>
        <div class="match-title">${escapeHtml(matchName(slot.match))}</div>
        <div class="match-meta">${escapeHtml(slot.match.roundName)} · Best of ${slot.match.targetLegs}</div>
      </article>
    `;
  }
```

- [ ] **Step 6: Make planned matches visibly align with the new board slots**

Update `renderMatchCard(match)`:

```js
    const liveSlots = boardUtils.getBoardLiveSlots(orderedMatches(), boardCount);
    const isBoardHighlight = liveSlots.some((slot) => slot.match && slot.match.id === match.id);
    const statusClass = match.status === "done"
      ? (match.validatedByAdmin ? "done" : "warn")
      : isBoardHighlight
        ? "live"
        : "";
    const statusText = match.status === "done"
      ? (match.validatedByAdmin ? "Klaar" : "Ingediend")
      : isBoardHighlight
        ? "Nu bovenin"
        : "Gepland";
```

Remove the old `Live` action button and simplify the card body to three columns:

```js
    return `
      <article class="match-card" data-match-id="${match.id}">
        <div>
          <div class="match-title">${escapeHtml(matchName(match))}</div>
          <div class="match-meta">${escapeHtml(match.roundName)} - Bord ${match.board}</div>
        </div>
        <span class="status ${statusClass}">${statusText}</span>
        <div class="score-inputs">
          <input ${readonly} class="score-a" type="number" min="0" max="${match.targetLegs}" value="${match.scoreA}">
          <strong>-</strong>
          <input ${readonly} class="score-b" type="number" min="0" max="${match.targetLegs}" value="${match.scoreB}">
        </div>
      </article>
    `;
```

- [ ] **Step 7: Remove obsolete `set-live` event handlers**

Delete the `card.querySelector(".set-live")...` block from `bindMatchInputs()`.

Update `commitMatchScore()` to remove the `state.liveMatchId` line:

```js
  function commitMatchScore(match, scoreA, scoreB) {
    match.scoreA = scoreA;
    match.scoreB = scoreB;
    match.status = "done";
    match.validatedByAdmin = isAdmin();
    match.scorer = role;
    syncTournamentProgress();
    saveState();
    renderAll();
    toast(isAdmin() ? "Uitslag direct verwerkt" : "Uitslag direct opgeslagen");
  }
```

- [ ] **Step 8: Run test to verify helper behavior still passes**

Run: `node --test tests/match-board-utils.test.js`

Expected: PASS

- [ ] **Step 9: Commit**

```bash
git add index.html app.js tests/match-board-utils.test.js
git commit -m "feat: show two live board slots"
```

If `git` is unavailable in this workspace, skip the commit and continue.

### Task 3: Apply the broadcast visual refresh and responsive cleanup

**Files:**
- Modify: `index.html`
- Modify: `styles.css`
- Modify: `app.js`

- [ ] **Step 1: Tighten the section header markup for more reliable button alignment**

In `index.html`, wrap heading text blocks consistently like:

```html
          <div class="section-heading">
            <div class="section-heading-copy">
              <p class="eyebrow">Stap 2</p>
              <h2>Loting en indeling</h2>
            </div>
            <div class="button-row button-row--actions">
              <button id="makeDrawBtn" class="primary-button" type="button">Loting maken</button>
              <button id="finalizeDrawBtn" class="secondary-button" type="button">Loting afronden</button>
            </div>
          </div>
```

Apply the same `section-heading-copy` pattern to setup, matches, standings, and the settings modal header.

- [ ] **Step 2: Refresh the draw summary and participant cards for better scanability**

In `app.js`, expand `renderDrawStage()` card content:

```js
  function renderDrawStage() {
    const entrants = state.teamMode === "pairs"
      ? Math.ceil(state.players.length / 2)
      : state.players.length;
    const modeLabel = state.mode === "pool-knockout" ? "Poule + knock-out" : "Single elimination";

    els.drawStage.innerHTML = `
      <article class="draw-card">
        <p class="eyebrow">Deelnemers</p>
        <strong>${entrants}</strong>
        <span>${state.teamMode === "pairs" ? "teams in de loting" : "spelers in de loting"}</span>
      </article>
      <article class="draw-card">
        <p class="eyebrow">Format</p>
        <strong>${escapeHtml(modeLabel)}</strong>
        <span>${state.mode === "pool-knockout" ? `${state.poolCount} poules richting finale` : "directe knock-outstructuur"}</span>
      </article>
      <article class="draw-card">
        <p class="eyebrow">Speelvloer</p>
        <strong>2 borden</strong>
        <span>parallel zichtbaar in het wedstrijdscherm</span>
      </article>
    `;
  }
```

Also update `renderTeams()` so each tile gets a compact index badge:

```js
          <div class="team-pill">
            <span class="team-seed">${index + 1}</span>
            <strong>${escapeHtml(team.name)}</strong>
            <span>${escapeHtml(team.members.join(" / "))}</span>
          </div>
```

- [ ] **Step 3: Replace the existing neutral surface styling with a stronger broadcast system**

In `styles.css`, update the top-level variables:

```css
:root {
  --bg: #f3efe7;
  --bg-deep: #111827;
  --surface: rgba(255, 255, 255, 0.9);
  --surface-strong: #ffffff;
  --surface-dark: rgba(17, 24, 39, 0.94);
  --line: rgba(148, 163, 184, 0.2);
  --text: #0f172a;
  --muted: #526077;
  --primary: #b42318;
  --primary-strong: #7a1c15;
  --accent: #d4a017;
  --accent-soft: rgba(212, 160, 23, 0.16);
  --ok: #157347;
  --warn: #b26b00;
  --shadow: 0 20px 50px rgba(15, 23, 42, 0.14);
}
```

Update the body background:

```css
body {
  position: relative;
  background:
    radial-gradient(circle at top left, rgba(212, 160, 23, 0.16), transparent 28%),
    radial-gradient(circle at top right, rgba(180, 35, 24, 0.16), transparent 24%),
    linear-gradient(180deg, #f7f3eb 0%, #edf2f7 100%);
  color: var(--text);
  font-family: "Avenir Next", "Trebuchet MS", "Segoe UI", sans-serif;
  overflow-x: hidden;
}
```

- [ ] **Step 4: Add the new live-strip and stronger card treatments**

Append or replace the relevant blocks in `styles.css`:

```css
.live-strip {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 14px;
  margin-bottom: 18px;
}

.live-board-card {
  padding: 18px;
  border: 1px solid rgba(212, 160, 23, 0.2);
  border-radius: 16px;
  background:
    linear-gradient(135deg, rgba(180, 35, 24, 0.96), rgba(17, 24, 39, 0.96));
  color: #fffaf4;
  box-shadow: 0 18px 36px rgba(17, 24, 39, 0.2);
}

.live-board-card.idle {
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.88), rgba(241, 245, 249, 0.94));
  color: var(--text);
  border-color: var(--line);
  box-shadow: var(--shadow);
}

.live-board-card .status {
  margin-bottom: 12px;
}

.section-heading-copy {
  min-width: 0;
}

.button-row--actions {
  justify-content: flex-end;
}

.draw-card,
.pool-card,
.team-pill,
.standing-card,
.match-card {
  border-radius: 16px;
}

.team-pill {
  position: relative;
  padding-left: 52px;
}

.team-seed {
  position: absolute;
  left: 14px;
  top: 14px;
  display: inline-grid;
  place-items: center;
  width: 26px;
  height: 26px;
  border-radius: 999px;
  background: rgba(180, 35, 24, 0.12);
  color: var(--primary-strong);
  font-size: 12px;
  font-weight: 800;
}
```

- [ ] **Step 5: Rebalance match cards and mobile breakpoints**

Update the main match card layout:

```css
.match-card {
  display: grid;
  grid-template-columns: minmax(0, 1.5fr) 120px minmax(180px, 240px);
  gap: 14px;
  align-items: center;
  background: rgba(255, 255, 255, 0.88);
  min-width: 0;
}
```

Replace the responsive blocks with:

```css
@media (max-width: 980px) {
  .app-shell,
  .form-grid,
  .hero-panel,
  .knockout-grid {
    grid-template-columns: 1fr;
  }

  .live-strip,
  .match-card {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 720px) {
  .button-row--actions,
  .button-row,
  .modal-actions {
    width: 100%;
  }

  .button-row--actions button,
  .button-row button,
  .modal-actions button {
    flex: 1 1 100%;
  }

  .live-strip {
    gap: 12px;
  }
}
```

- [ ] **Step 6: Run the helper test suite after the UI refactor**

Run: `node --test tests/match-board-utils.test.js`

Expected: PASS

- [ ] **Step 7: Launch the app and perform manual visual verification**

Run: `node server.js`

Open: `http://localhost:4173`

Verify:
- setup CTA aligns cleanly on desktop and mobile widths
- draw cards feel more like a broadcast dashboard
- participant and pool cards are easier to scan
- live strip shows `Bord 1` and `Bord 2`
- one-board-remaining state renders an idle second slot cleanly

- [ ] **Step 8: Commit**

```bash
git add index.html app.js styles.css match-board-utils.js tests/match-board-utils.test.js
git commit -m "feat: refresh dartsapp with broadcast layout"
```

If `git` is unavailable in this workspace, skip the commit and continue.

### Task 4: Final regression and cleanup

**Files:**
- Modify: `app.js`
- Modify: `styles.css`
- Test: `tests/match-board-utils.test.js`

- [ ] **Step 1: Write one last regression test for an empty tournament state**

Append this test:

```js
test("getBoardLiveSlots returns explicit idle slots when there are no matches", () => {
  const slots = getBoardLiveSlots([], 2);

  assert.equal(slots.length, 2);
  assert.equal(slots[0].match, null);
  assert.equal(slots[1].match, null);
  assert.equal(slots[0].state, "idle");
  assert.equal(slots[1].state, "idle");
});
```

- [ ] **Step 2: Run test to verify it passes**

Run: `node --test tests/match-board-utils.test.js`

Expected: PASS

- [ ] **Step 3: Remove dead code and visual leftovers**

In `app.js`, confirm all of the following are removed:

- `liveMatchId` state field
- `nextUnfinishedMatch()` helper
- `nextLiveBtn` bindings
- `set-live` button rendering

In `styles.css`, confirm old single-live assumptions are removed:

- `.live-panel` styles no longer drive the matches header state
- `.match-card > .button-row` rules tied to the removed live button are deleted if unused

- [ ] **Step 4: Run the app and perform full flow verification**

Run: `node server.js`

Open: `http://localhost:4173`

Execute this manual flow:

1. Create an 8-player pool + knock-out tournament.
2. Generate the draw.
3. Finalize the draw.
4. Confirm the match screen immediately shows two live board slots.
5. Enter scores for several pool matches and confirm the top slots advance naturally per board.
6. Finish all pool matches and confirm tie-break/semi/final generation still behaves correctly.
7. Open standings on a narrow viewport and confirm the table cards remain readable.

- [ ] **Step 5: Commit**

```bash
git add app.js styles.css tests/match-board-utils.test.js
git commit -m "chore: remove obsolete single-live behavior"
```

If `git` is unavailable in this workspace, skip the commit and continue.
