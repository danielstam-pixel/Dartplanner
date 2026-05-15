# Dartsapp Tournament Control Room Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild the app’s front-end into a tournament-first darts control room with `Wedstrijden` as the home screen and `Loting` as a dedicated premium draw environment, while preserving the existing tournament logic.

**Architecture:** Keep the current server-backed vanilla app and existing tournament progression rules, but reorganize the render layer into clearer screen zones and helper functions. Extract schedule and screen-view concerns into small pure helpers where useful, then rebuild the DOM structure and CSS around those helpers so the app feels like a modern tournament operations panel rather than a linear form wizard.

**Tech Stack:** Static HTML, vanilla CSS, vanilla browser JavaScript, Node built-in test runner, local Git repository with GitHub remote

---

## File Structure

- Create: `tournament-view-models.js`
- Create: `tests/tournament-view-models.test.js`
- Modify: `index.html`
- Modify: `app.js`
- Modify: `styles.css`
- Modify: `match-board-utils.js`
- Modify: `tests/match-board-utils.test.js`

### Task 1: Extract home-screen queue and panel view models

**Files:**
- Create: `tournament-view-models.js`
- Create: `tests/tournament-view-models.test.js`
- Modify: `index.html`
- Modify: `app.js`
- Test: `tests/tournament-view-models.test.js`

- [ ] **Step 1: Write the failing test**

Create `tests/tournament-view-models.test.js` with:

```js
const test = require("node:test");
const assert = require("node:assert/strict");
const {
  buildMatchQueue,
  buildPoolProgressSummary,
  buildKnockoutStatus
} = require("../tournament-view-models.js");

test("buildMatchQueue separates now, next, and later items from schedule order", () => {
  const matches = [
    { id: "m1", board: 1, phase: "pool", roundName: "Poule A", status: "planned", sortIndex: 0 },
    { id: "m2", board: 2, phase: "pool", roundName: "Poule A", status: "planned", sortIndex: 1 },
    { id: "m3", board: 1, phase: "pool", roundName: "Poule A", status: "planned", sortIndex: 2 },
    { id: "m4", board: 2, phase: "pool", roundName: "Poule A", status: "planned", sortIndex: 3 }
  ];

  const queue = buildMatchQueue(matches, 2);

  assert.deepEqual(queue.now.map((match) => match.id), ["m1", "m2"]);
  assert.deepEqual(queue.next.map((match) => match.id), ["m3", "m4"]);
  assert.deepEqual(queue.later, []);
});

test("buildPoolProgressSummary counts completed and remaining pool matches", () => {
  const matches = [
    { phase: "pool", status: "done" },
    { phase: "pool", status: "done" },
    { phase: "pool", status: "planned" },
    { phase: "semi", status: "planned" }
  ];

  const summary = buildPoolProgressSummary(matches);

  assert.equal(summary.completed, 2);
  assert.equal(summary.total, 3);
  assert.equal(summary.remaining, 1);
});

test("buildKnockoutStatus reports waiting state before semifinals exist", () => {
  const status = buildKnockoutStatus([]);

  assert.equal(status.title, "Knock-out wacht");
  assert.match(status.body, /poules/i);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test tests/tournament-view-models.test.js`

Expected: FAIL with `Cannot find module '../tournament-view-models.js'`.

- [ ] **Step 3: Write minimal implementation**

Create `tournament-view-models.js` with:

```js
(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) {
    module.exports = api;
  }
  root.DartsTournamentViewModels = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  function buildMatchQueue(matches, boardCount) {
    const openMatches = matches.filter((match) => match.status !== "done");
    return {
      now: openMatches.slice(0, boardCount),
      next: openMatches.slice(boardCount, boardCount * 2),
      later: openMatches.slice(boardCount * 2)
    };
  }

  function buildPoolProgressSummary(matches) {
    const poolMatches = matches.filter((match) => match.phase === "pool");
    const completed = poolMatches.filter((match) => match.status === "done").length;
    return {
      completed,
      total: poolMatches.length,
      remaining: poolMatches.length - completed
    };
  }

  function buildKnockoutStatus(matches) {
    const semiMatches = matches.filter((match) => match.phase === "semi");
    const finalMatch = matches.find((match) => match.phase === "final");

    if (!semiMatches.length) {
      return {
        title: "Knock-out wacht",
        body: "Rond eerst de poules af om halve finales te bepalen."
      };
    }

    if (!finalMatch) {
      return {
        title: "Halve finales actief",
        body: "De knock-outfase is gestart en wacht op finalisten."
      };
    }

    return {
      title: "Finale in beeld",
      body: finalMatch.status === "done"
        ? "De finale is afgerond."
        : "De finale wacht op de beslissende uitslag."
    };
  }

  return {
    buildMatchQueue,
    buildPoolProgressSummary,
    buildKnockoutStatus
  };
});
```

- [ ] **Step 4: Load the helper in the app shell**

Update the script tags in `index.html` from:

```html
    <script src="match-board-utils.js"></script>
    <script src="app.js"></script>
```

to:

```html
    <script src="match-board-utils.js"></script>
    <script src="tournament-view-models.js"></script>
    <script src="app.js"></script>
```

- [ ] **Step 5: Wire the helper into `app.js`**

Add this near the top of `app.js` after `boardUtils`:

```js
  const tournamentViewModels = window.DartsTournamentViewModels;
```

- [ ] **Step 6: Run test to verify it passes**

Run: `node --test tests/tournament-view-models.test.js`

Expected: PASS

- [ ] **Step 7: Commit**

```bash
git -c safe.directory=C:/Projecten/Dartsapp add tournament-view-models.js tests/tournament-view-models.test.js index.html app.js
git -c safe.directory=C:/Projecten/Dartsapp commit -m "test: add tournament home view models"
```

If Git blocks on missing identity, stop and configure `user.name` / `user.email` before continuing.

### Task 2: Rebuild the main screen into a tournament control room

**Files:**
- Modify: `index.html`
- Modify: `app.js`
- Modify: `styles.css`
- Test: `tests/tournament-view-models.test.js`

- [ ] **Step 1: Write a failing queue classification test**

Append this to `tests/tournament-view-models.test.js`:

```js
test("buildMatchQueue leaves overflow matches in later", () => {
  const matches = [
    { id: "m1", status: "planned" },
    { id: "m2", status: "planned" },
    { id: "m3", status: "planned" },
    { id: "m4", status: "planned" },
    { id: "m5", status: "planned" }
  ];

  const queue = buildMatchQueue(matches, 2);

  assert.deepEqual(queue.now.map((match) => match.id), ["m1", "m2"]);
  assert.deepEqual(queue.next.map((match) => match.id), ["m3", "m4"]);
  assert.deepEqual(queue.later.map((match) => match.id), ["m5"]);
});
```

- [ ] **Step 2: Run test to verify it passes before the UI refactor**

Run: `node --test tests/tournament-view-models.test.js`

Expected: PASS

- [ ] **Step 3: Replace the matches view structure in `index.html`**

Replace:

```html
        <section id="matches" class="view">
          <div class="section-heading">
            <div class="section-heading-copy">
              <p class="eyebrow">Stap 3</p>
              <h2>Wedstrijden</h2>
            </div>
          </div>
          <div id="livePanel" class="live-strip"></div>
          <div id="matchSections" class="match-sections"></div>
        </section>
```

with:

```html
        <section id="matches" class="view tournament-home">
          <div class="section-heading tournament-home-heading">
            <div class="section-heading-copy">
              <p class="eyebrow">Wedstrijdregie</p>
              <h2>Live toernooi</h2>
            </div>
          </div>
          <div class="home-grid">
            <section class="home-primary">
              <div id="livePanel" class="live-strip"></div>
              <div id="matchQueuePanel" class="panel"></div>
            </section>
            <aside class="home-secondary">
              <div id="poolProgressPanel" class="panel"></div>
              <div id="homeKnockoutPanel" class="panel"></div>
            </aside>
          </div>
          <div id="matchSections" class="match-sections"></div>
        </section>
```

- [ ] **Step 4: Extend `els` and add new render helpers**

In `app.js`, add:

```js
    matchQueuePanel: document.getElementById("matchQueuePanel"),
    poolProgressPanel: document.getElementById("poolProgressPanel"),
    homeKnockoutPanel: document.getElementById("homeKnockoutPanel"),
```

Add these helpers near `renderMatches()`:

```js
  function renderHomeMatchQueue(queue) {
    const section = (title, matches) => `
      <div class="queue-block">
        <p class="queue-label">${title}</p>
        ${matches.length
          ? matches.map((match) => `
              <article class="queue-card">
                <strong>${escapeHtml(matchName(match))}</strong>
                <span class="match-meta">${escapeHtml(match.roundName)} · Bord ${match.board}</span>
              </article>
            `).join("")
          : "<p class=\"muted\">Geen wedstrijden in deze rij.</p>"}
      </div>
    `;

    els.matchQueuePanel.innerHTML = `
      <div class="section-heading compact">
        <h3>Nu en straks</h3>
      </div>
      ${section("Nu", queue.now)}
      ${section("Hierna", queue.next)}
      ${queue.later.length ? section("Later", queue.later) : ""}
    `;
  }

  function renderPoolProgress(summary) {
    els.poolProgressPanel.innerHTML = `
      <div class="section-heading compact">
        <h3>Poulevoortgang</h3>
      </div>
      <div class="progress-metrics">
        <div><strong>${summary.completed}</strong><span>Klaar</span></div>
        <div><strong>${summary.remaining}</strong><span>Resterend</span></div>
        <div><strong>${summary.total}</strong><span>Totaal</span></div>
      </div>
    `;
  }

  function renderHomeKnockoutStatus(status) {
    els.homeKnockoutPanel.innerHTML = `
      <div class="section-heading compact">
        <h3>Knock-outstatus</h3>
      </div>
      <div class="bracket-slot">
        <strong>${escapeHtml(status.title)}</strong>
        <div>${escapeHtml(status.body)}</div>
      </div>
    `;
  }
```

- [ ] **Step 5: Drive the new home screen from the view-model helper**

At the top of `renderMatches()`, after computing `ordered` and `liveSlots`, add:

```js
    const queue = tournamentViewModels.buildMatchQueue(ordered, boardCount);
    const poolProgress = tournamentViewModels.buildPoolProgressSummary(state.matches);
    const knockoutStatus = tournamentViewModels.buildKnockoutStatus(state.matches);

    renderHomeMatchQueue(queue);
    renderPoolProgress(poolProgress);
    renderHomeKnockoutStatus(knockoutStatus);
```

- [ ] **Step 6: Add the control-room layout to `styles.css`**

Append:

```css
.tournament-home-heading {
  margin-bottom: 18px;
}

.home-grid {
  display: grid;
  grid-template-columns: minmax(0, 1.45fr) minmax(280px, 0.75fr);
  gap: 18px;
  margin-bottom: 18px;
}

.home-primary,
.home-secondary {
  display: grid;
  gap: 16px;
}

.queue-block {
  display: grid;
  gap: 10px;
}

.queue-label {
  margin: 0;
  color: var(--muted);
  font-size: 12px;
  font-weight: 800;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.queue-card {
  display: grid;
  gap: 4px;
  padding: 12px 14px;
  border: 1px solid var(--line);
  border-radius: 14px;
  background: rgba(255, 255, 255, 0.78);
}

.progress-metrics {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 10px;
}

.progress-metrics div {
  display: grid;
  gap: 4px;
  padding: 12px;
  border-radius: 14px;
  background: rgba(15, 123, 255, 0.08);
  border: 1px solid rgba(15, 123, 255, 0.12);
}

.progress-metrics strong {
  font-size: 24px;
}
```

- [ ] **Step 7: Make the layout responsive**

Add to the `@media (max-width: 980px)` block:

```css
  .home-grid,
  .progress-metrics {
    grid-template-columns: 1fr;
  }
```

- [ ] **Step 8: Run test to verify it passes**

Run: `node --test tests/tournament-view-models.test.js`

Expected: PASS

- [ ] **Step 9: Commit**

```bash
git -c safe.directory=C:/Projecten/Dartsapp add index.html app.js styles.css tests/tournament-view-models.test.js
git -c safe.directory=C:/Projecten/Dartsapp commit -m "feat: build tournament control room home"
```

### Task 3: Rebuild the draw tab into a dedicated premium draw environment

**Files:**
- Modify: `index.html`
- Modify: `app.js`
- Modify: `styles.css`
- Test: `tests/tournament-view-models.test.js`

- [ ] **Step 1: Add a pure draw-state test**

Append to `tests/tournament-view-models.test.js`:

```js
test("buildKnockoutStatus reports semifinal activity when semis exist without a final", () => {
  const status = buildKnockoutStatus([
    { phase: "semi", status: "planned" },
    { phase: "semi", status: "planned" }
  ]);

  assert.equal(status.title, "Halve finales actief");
});
```

- [ ] **Step 2: Run test to verify it passes before the draw rebuild**

Run: `node --test tests/tournament-view-models.test.js`

Expected: PASS

- [ ] **Step 3: Replace the draw view structure in `index.html`**

Replace the body of the draw view with:

```html
        <section id="draw" class="view draw-mode">
          <div class="section-heading draw-heading">
            <div class="section-heading-copy">
              <p class="eyebrow">Loting</p>
              <h2>Indeling en controle</h2>
            </div>
            <div class="button-row button-row--actions">
              <button id="makeDrawBtn" class="primary-button" type="button">Loting maken</button>
              <button id="finalizeDrawBtn" class="secondary-button" type="button">Loting afronden</button>
            </div>
          </div>
          <div id="drawPreflight" class="draw-preflight"></div>
          <div id="drawResults" class="draw-results">
            <section id="teamsPanel" class="panel draw-panel"></section>
            <section class="panel draw-pools-shell">
              <div class="section-heading compact">
                <h3>Poule-indeling</h3>
              </div>
              <div id="poolsPanel" class="pools-grid"></div>
            </section>
          </div>
        </section>
```

- [ ] **Step 4: Rename and reshape the draw summary renderer**

In `app.js`, rename `drawStage` references to `drawPreflight` in `els`.

Replace `renderDrawStage()` with:

```js
  function renderDrawStage() {
    const entrants = state.teamMode === "pairs"
      ? Math.ceil(state.players.length / 2)
      : state.players.length;
    const modeLabel = state.mode === "pool-knockout" ? "Poule + knock-out" : "Single elimination";
    const hasDraw = state.pools.length > 0;

    els.drawPreflight.innerHTML = `
      <article class="draw-hero-card">
        <div>
          <p class="eyebrow">${hasDraw ? "Loting gereed" : "Klaar om te loten"}</p>
          <h3>${hasDraw ? "Controleer spelers en poules" : "Maak direct de toernooi-indeling"}</h3>
          <p class="muted">
            ${hasDraw
              ? "De uitslag staat hieronder en kan nog handmatig worden gecorrigeerd."
              : "Bevestig de loting en laat de app meteen de deelnemers en poules indelen."}
          </p>
        </div>
        <div class="draw-preflight-metrics">
          <div><strong>${entrants}</strong><span>${state.teamMode === "pairs" ? "koppels" : "spelers"}</span></div>
          <div><strong>${state.mode === "pool-knockout" ? state.poolCount : 1}</strong><span>poules</span></div>
          <div><strong>${escapeHtml(modeLabel)}</strong><span>format</span></div>
        </div>
      </article>
    `;
  }
```

- [ ] **Step 5: Update the entrants panel so it feels like draw output**

In `renderTeams()`, change the headings to:

```js
        <div class="section-heading compact">
          <h3>${state.teamMode === "pairs" ? "Gemaakte koppels" : "Gelote spelers"}</h3>
        </div>
```

Keep `renderMemberBlock()` as the source of single-name chips.

- [ ] **Step 6: Add draw-mode styling**

Append to `styles.css`:

```css
.draw-heading {
  margin-bottom: 18px;
}

.draw-preflight {
  margin-bottom: 18px;
}

.draw-hero-card {
  display: grid;
  grid-template-columns: minmax(0, 1.2fr) minmax(260px, 0.8fr);
  gap: 18px;
  padding: 22px;
  border: 1px solid var(--line);
  border-radius: 20px;
  background:
    radial-gradient(circle at top left, rgba(15, 123, 255, 0.16), transparent 42%),
    linear-gradient(135deg, rgba(255, 255, 255, 0.98), rgba(232, 247, 255, 0.95));
  box-shadow: var(--shadow);
}

.draw-preflight-metrics {
  display: grid;
  gap: 10px;
}

.draw-preflight-metrics div {
  display: grid;
  gap: 4px;
  padding: 12px 14px;
  border-radius: 14px;
  background: rgba(255, 255, 255, 0.85);
  border: 1px solid var(--line);
}

.draw-results {
  align-items: start;
}
```

- [ ] **Step 7: Make draw mode responsive**

Add to `@media (max-width: 980px)`:

```css
  .draw-hero-card {
    grid-template-columns: 1fr;
  }
```

- [ ] **Step 8: Run test to verify it passes**

Run: `node --test tests/tournament-view-models.test.js`

Expected: PASS

- [ ] **Step 9: Commit**

```bash
git -c safe.directory=C:/Projecten/Dartsapp add index.html app.js styles.css tests/tournament-view-models.test.js
git -c safe.directory=C:/Projecten/Dartsapp commit -m "feat: rebuild draw tab as premium draw mode"
```

### Task 4: Refresh setup, standings, and verification flow around the new UI

**Files:**
- Modify: `index.html`
- Modify: `app.js`
- Modify: `styles.css`
- Modify: `tests/tournament-view-models.test.js`
- Modify: `tournament-state.json`

- [ ] **Step 1: Add one last regression test for the finished-state knockout message**

Append:

```js
test("buildKnockoutStatus reports finished final state", () => {
  const status = buildKnockoutStatus([
    { phase: "semi", status: "done" },
    { phase: "semi", status: "done" },
    { phase: "final", status: "done" }
  ]);

  assert.equal(status.title, "Finale in beeld");
  assert.match(status.body, /afgerond/i);
});
```

- [ ] **Step 2: Run test to verify it passes**

Run: `node --test tests/tournament-view-models.test.js`

Expected: PASS

- [ ] **Step 3: Tighten setup and standings copy to fit the new app tone**

In `index.html`, change:

```html
              <p class="eyebrow">Stap 1</p>
              <h2>Toernooi aanmaken</h2>
```

to:

```html
              <p class="eyebrow">Voorbereiding</p>
              <h2>Toernooi instellen</h2>
```

And change:

```html
              <p class="eyebrow">Stap 4</p>
              <h2>Standen en bracket</h2>
```

to:

```html
              <p class="eyebrow">Analyse</p>
              <h2>Standen en knock-out</h2>
```

- [ ] **Step 4: Add supporting setup and standings styles**

Append to `styles.css`:

```css
.content > .view {
  display: grid;
  gap: 18px;
}

.standing-card,
.pool-card,
.panel,
.modal-card {
  background: rgba(255, 255, 255, 0.9);
}
```

- [ ] **Step 5: Update the bundled sample state to the new clean schema**

Ensure `tournament-state.json` keeps only:

```json
{
  "id": "d0b2dc23-8fe5-48b7-ae50-77cd79c0fa5c",
  "role": "admin",
  "stage": "setup",
  "name": "Vrijdagavond Darts",
  "playerCount": 8,
  "mode": "pool-knockout",
  "teamMode": "single",
  "poolCount": 2,
  "legsTarget": 3,
  "players": ["Bas", "Daan", "Emma", "Fatima", "Gijs", "Hugo", "Iris", "Jeroen"],
  "teams": [],
  "pools": [],
  "matches": [],
  "updatedAt": 1778790399148
}
```

- [ ] **Step 6: Run the full test set**

Run:

```bash
node --test tests/match-board-utils.test.js
node --test tests/tournament-view-models.test.js
```

Expected:
- PASS
- PASS

- [ ] **Step 7: Run the local app and verify the main routes respond**

Run:

```powershell
$proc = Start-Process -FilePath node -ArgumentList 'server.js' -WorkingDirectory 'C:\Projecten\Dartsapp' -WindowStyle Hidden -PassThru
Start-Sleep -Seconds 2
$root = Invoke-WebRequest -Uri 'http://localhost:4173/' -UseBasicParsing
$state = Invoke-WebRequest -Uri 'http://localhost:4173/api/state' -UseBasicParsing
Write-Output ('ROOT ' + $root.StatusCode)
Write-Output ('STATE ' + $state.StatusCode)
if (Get-Process -Id $proc.Id -ErrorAction SilentlyContinue) { Stop-Process -Id $proc.Id -Force }
```

Expected:
- `ROOT 200`
- `STATE 200`

- [ ] **Step 8: Commit**

```bash
git -c safe.directory=C:/Projecten/Dartsapp add index.html app.js styles.css tests/tournament-view-models.test.js tournament-state.json
git -c safe.directory=C:/Projecten/Dartsapp commit -m "feat: finish tournament control room refresh"
```
