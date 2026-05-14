(function () {
  const storageKey = "dartsapp:tournament";
  const serverBacked = location.protocol !== "file:";
  const channel = !serverBacked && "BroadcastChannel" in window ? new BroadcastChannel("dartsapp") : null;
  const urlRole = new URLSearchParams(location.search).get("role");
  const boardCount = 2;
  const demoPlayers = [
    "Bas", "Daan", "Emma", "Fatima", "Gijs", "Hugo", "Iris", "Jeroen",
    "Kim", "Lars", "Mila", "Nora", "Omar", "Puck", "Ravi", "Sanne"
  ];

  const boardUtils = window.DartsMatchBoardUtils;
  const tournamentViewModels = window.DartsTournamentViewModels;

  let state = defaultState();
  let role = urlRole || "admin";
  let activeView = "setup";

  const els = {
    roleBadge: document.getElementById("roleBadge"),
    stepper: document.getElementById("stepper"),
    progressPanel: document.getElementById("progressPanel"),
    drawPreflight: document.getElementById("drawPreflight"),
    drawResults: document.getElementById("drawResults"),
    teamsPanel: document.getElementById("teamsPanel"),
    poolsPanel: document.getElementById("poolsPanel"),
    livePanel: document.getElementById("livePanel"),
    matchQueuePanel: document.getElementById("matchQueuePanel"),
    poolProgressPanel: document.getElementById("poolProgressPanel"),
    homeKnockoutPanel: document.getElementById("homeKnockoutPanel"),
    matchSections: document.getElementById("matchSections"),
    standingsPanel: document.getElementById("standingsPanel"),
    knockoutPanel: document.getElementById("knockoutPanel"),
    winnerPanel: document.getElementById("winnerPanel"),
    shareLinks: document.getElementById("shareLinks"),
    toast: document.getElementById("toast"),
    heroPlayers: document.getElementById("heroPlayers"),
    poolCountWrap: document.getElementById("poolCountWrap"),
    settingsModal: document.getElementById("settingsModal"),
    setup: {
      name: document.getElementById("tournamentName"),
      playerCount: document.getElementById("playerCount"),
      mode: document.getElementById("tournamentMode"),
      teamMode: document.getElementById("teamMode"),
      poolCount: document.getElementById("poolCount"),
      legsTarget: document.getElementById("legsTarget"),
      playersList: document.getElementById("playersList")
    }
  };

  boot();

  async function boot() {
    state = await loadState();
    role = urlRole || state.role || "admin";
    state.role = role;
    activeView = allowedViews()[0];
    init();
  }

  function init() {
    hydrateSetup();
    bindNavigation();
    bindSetup();
    bindActions();
    bindSettings();
    renderAll();
    applyRole();

    if (serverBacked && "EventSource" in window) {
      const events = new EventSource("/api/events");
      events.onmessage = async () => {
        state = await loadState();
        state.role = role;
        renderAll();
        applyRole();
      };
    } else if (channel) {
      channel.onmessage = async (event) => {
        if (event.data && event.data.type === "state-updated") {
          state = await loadState();
          state.role = role;
          renderAll();
          applyRole();
        }
      };
    }
  }

  function defaultState() {
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
  }

  async function loadState() {
    try {
      if (serverBacked) {
        const response = await fetch("/api/state");
        if (response.ok) {
          const remote = await response.json();
          if (remote) {
            const normalized = normalizeState(remote);
            localStorage.setItem(storageKey, JSON.stringify(normalized));
            return normalized;
          }
        }
      }
      const raw = localStorage.getItem(storageKey);
      return raw ? normalizeState(JSON.parse(raw)) : defaultState();
    } catch {
      return defaultState();
    }
  }

  function normalizeState(raw) {
    const merged = { ...defaultState(), ...raw };
    delete merged.liveMatchId;
    merged.matches = Array.isArray(merged.matches)
      ? merged.matches.map((match, index) => ({
          ...match,
          sortIndex: Number.isFinite(match.sortIndex) ? match.sortIndex : index
        }))
      : [];
    if (!raw.stage) {
      if (Array.isArray(raw.matches) && raw.matches.length) {
        merged.stage = "play";
      } else if (Array.isArray(raw.pools) && raw.pools.length) {
        merged.stage = "draw";
      } else {
        merged.stage = "setup";
      }
    }
    if (!raw.poolCount) {
      merged.poolCount = Array.isArray(raw.pools) && raw.pools.length ? raw.pools.length : defaultState().poolCount;
    }
    return merged;
  }

  function saveState({ broadcast = true } = {}) {
    state.updatedAt = Date.now();
    localStorage.setItem(storageKey, JSON.stringify(state));
    if (serverBacked) {
      fetch("/api/state", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(state)
      }).catch(() => toast("Server opslaan mislukt"));
    }
    if (broadcast && channel) {
      channel.postMessage({ type: "state-updated", updatedAt: state.updatedAt });
    }
  }

  function bindNavigation() {
    document.querySelectorAll(".nav-item").forEach((button) => {
      button.addEventListener("click", () => {
        navigate(button.dataset.view);
      });
    });
  }

  function bindSetup() {
    els.setup.playerCount.addEventListener("change", () => {
      renderPlayerInputs();
      renderSetupMeta();
    });
    els.setup.mode.addEventListener("change", renderSetupMeta);
    document.getElementById("fillPlayersBtn").addEventListener("click", renderPlayerInputs);
    document.getElementById("saveSetupBtn").addEventListener("click", () => {
      if (!isAdmin()) return;
      if (!collectSetup()) return;
      state.teams = [];
      state.pools = [];
      state.matches = [];
      state.stage = "draw";
      saveState();
      renderAll();
      navigate("draw");
      toast("Opzet vastgezet, klaar voor de loting");
    });
  }

  function bindActions() {
    document.getElementById("makeDrawBtn").addEventListener("click", () => {
      if (!isAdmin()) return;
      makeDraw();
      saveState();
      renderAll();
      els.drawResults.scrollIntoView({ behavior: "smooth", block: "start" });
      toast("Loting gemaakt");
    });
    document.getElementById("finalizeDrawBtn").addEventListener("click", () => {
      if (!isAdmin()) return;
      if (!state.pools.length) {
        toast("Maak eerst een loting");
        return;
      }
      buildPoolMatches();
      state.stage = "play";
      saveState();
      renderAll();
      navigate("matches");
      toast("Loting afgerond, wedstrijden geopend");
    });
    document.getElementById("exportCsvBtn").addEventListener("click", exportCsv);
    document.getElementById("printBtn").addEventListener("click", () => window.print());
  }

  function bindSettings() {
    document.getElementById("settingsBtn").addEventListener("click", openSettings);
    document.getElementById("closeSettingsBtn").addEventListener("click", closeSettings);
    document.querySelector("[data-close-settings='true']").addEventListener("click", closeSettings);
    document.getElementById("copyLinkBtn").addEventListener("click", () => copyText(location.href));
    document.getElementById("resetBtn").addEventListener("click", () => {
      if (!isAdmin()) return;
      if (!confirm("Weet je zeker dat je dit toernooi wilt resetten?")) return;
      localStorage.removeItem(storageKey);
      state = { ...defaultState(), role };
      saveState();
      renderAll();
      closeSettings();
      navigate("setup");
      toast("Toernooi gereset");
    });
    document.querySelectorAll(".copy-role-link").forEach((button) => {
      button.addEventListener("click", () => copyText(roleLink(button.dataset.role)));
    });
  }

  function hydrateSetup() {
    els.setup.name.value = state.name;
    els.setup.playerCount.value = state.playerCount;
    els.setup.mode.value = state.mode;
    els.setup.teamMode.value = state.teamMode;
    els.setup.poolCount.value = String(state.poolCount);
    els.setup.legsTarget.value = state.legsTarget;
    renderPlayerInputs();
    renderSetupMeta();
  }

  function renderAll() {
    hydrateSetup();
    renderProgress();
    renderStepper();
    renderDrawStage();
    renderTeams();
    renderPools();
    renderMatches();
    renderStandings();
    renderAccess();
    navigate(activeView);
  }

  function renderSetupMeta() {
    const count = Math.max(4, Number(els.setup.playerCount.value) || 4);
    els.heroPlayers.textContent = count;
    const isPoolMode = els.setup.mode.value === "pool-knockout";
    els.poolCountWrap.style.display = isPoolMode ? "grid" : "none";
  }

  function renderPlayerInputs() {
    const count = Math.max(4, Number(els.setup.playerCount.value) || 4);
    const existing = Array.from(els.setup.playersList.querySelectorAll("input")).map((input) => input.value.trim());
    const names = existing.some(Boolean) ? existing : state.players;
    els.setup.playersList.innerHTML = "";
    for (let index = 0; index < count; index += 1) {
      const row = document.createElement("div");
      row.className = "name-row";
      row.innerHTML = `
        <span class="row-index">${index + 1}</span>
        <input type="text" value="${escapeHtml(names[index] || "")}" placeholder="Speler ${index + 1}">
      `;
      els.setup.playersList.appendChild(row);
    }
  }

  function collectSetup() {
    const players = Array.from(els.setup.playersList.querySelectorAll("input"))
      .map((input) => input.value.trim())
      .filter(Boolean);
    const playerCount = Math.max(4, Number(els.setup.playerCount.value) || players.length || 4);
    if (players.length !== playerCount) {
      toast("Vul alle spelersnamen in");
      return false;
    }
    if (els.setup.teamMode.value === "pairs" && players.length % 2 !== 0) {
      toast("Voor koppels is een even aantal spelers nodig");
      return false;
    }
    state.name = els.setup.name.value.trim() || "Darttoernooi";
    state.playerCount = playerCount;
    state.mode = els.setup.mode.value;
    state.teamMode = els.setup.teamMode.value;
    state.poolCount = state.mode === "pool-knockout" ? Number(els.setup.poolCount.value) || 1 : 1;
    state.legsTarget = Number(els.setup.legsTarget.value) || 3;
    state.players = players;
    return true;
  }

  function makeDraw() {
    const entrants = state.teamMode === "pairs"
      ? makeTeams(state.players)
      : state.players.map((name) => ({ id: slug(name), name, members: [name] }));
    const shuffled = shuffle(entrants);
    const poolCount = state.mode === "pool-knockout" ? state.poolCount : 1;
    state.teams = entrants;
    state.pools = Array.from({ length: poolCount }, (_, index) => ({
      id: `pool-${index + 1}`,
      name: poolCount === 1 ? "Poule A" : `Poule ${String.fromCharCode(65 + index)}`,
      entrants: []
    }));
    shuffled.forEach((entrant, index) => {
      state.pools[index % poolCount].entrants.push(entrant.id);
    });
    if (state.mode !== "pool-knockout") {
      state.matches = makeSingleEliminationMatches(state.pools[0].entrants);
    }
  }

  function makeTeams(players) {
    return chunk(shuffle(players), 2).map((members, index) => ({
      id: `team-${index + 1}-${slug(members.join("-"))}`,
      name: `${members[0]} + ${members[1]}`,
      members
    }));
  }

  function buildPoolMatches() {
    if (state.mode !== "pool-knockout") return;
    const matches = [];
    state.pools.forEach((pool) => {
      for (let i = 0; i < pool.entrants.length; i += 1) {
        for (let j = i + 1; j < pool.entrants.length; j += 1) {
          const sortIndex = matches.length;
          matches.push(makeMatch({
            id: `pool-${pool.id}-${pool.entrants[i]}-${pool.entrants[j]}`,
            poolId: pool.id,
            phase: "pool",
            roundName: pool.name,
            entrantA: pool.entrants[i],
            entrantB: pool.entrants[j],
            board: ((matches.length % boardCount) + 1),
            sortIndex,
            targetLegs: state.legsTarget
          }));
        }
      }
    });
    state.matches = matches;
  }

  function makeSingleEliminationMatches(entrants) {
    return chunk(entrants, 2)
      .filter((pair) => pair.length === 2)
      .map((pair, index) => makeMatch({
        id: `single-round-1-${index + 1}`,
        poolId: "knockout",
        phase: "semi",
        roundName: `Ronde 1`,
        entrantA: pair[0],
        entrantB: pair[1],
        board: ((index % boardCount) + 1),
        sortIndex: index,
        targetLegs: state.legsTarget
      }));
  }

  function makeMatch(config) {
    return {
      id: config.id,
      poolId: config.poolId,
      phase: config.phase,
      roundName: config.roundName,
      entrantA: config.entrantA,
      entrantB: config.entrantB,
      board: config.board,
      sortIndex: Number.isFinite(config.sortIndex) ? config.sortIndex : state.matches.length,
      targetLegs: config.targetLegs,
      scoreA: "",
      scoreB: "",
      status: "planned",
      scorer: "",
      validatedByAdmin: false
    };
  }

  function renderProgress() {
    const regularDone = state.matches.filter((match) => match.phase === "pool" && match.status === "done").length;
    const regularTotal = state.matches.filter((match) => match.phase === "pool").length;
    const text = state.stage === "setup"
      ? "Maak het toernooi klaar voor de loting."
      : state.stage === "draw"
        ? "Maak de indeling en controleer direct de gemaakte poules."
        : `Poolwedstrijden klaar: ${regularDone}/${regularTotal}. De knock-out volgt automatisch zodra de poules rond zijn.`;
    els.progressPanel.innerHTML = `
      <h3>Toernooistatus</h3>
      <p>${escapeHtml(text)}</p>
      <p class="muted">${escapeHtml(state.name)}</p>
    `;
  }

  function renderStepper() {
    const allowed = allowedViews();
    document.querySelectorAll(".nav-item").forEach((button) => {
      const enabled = allowed.includes(button.dataset.view);
      button.disabled = !enabled;
      button.classList.toggle("active", button.dataset.view === activeView);
    });
  }

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

  function renderTeams() {
    if (!state.teams.length) {
      els.teamsPanel.innerHTML = `
        <div class="section-heading compact">
          <h3>${state.teamMode === "pairs" ? "Gemaakte koppels" : "Gelote spelers"}</h3>
        </div>
        <p class="muted">Klik op <strong>Loting maken</strong> om hier direct de gemaakte indeling te zien.</p>
      `;
      return;
    }
    els.teamsPanel.innerHTML = `
      <div class="section-heading compact">
        <h3>${state.teamMode === "pairs" ? "Gemaakte koppels" : "Gelote spelers"}</h3>
      </div>
      <div class="teams-list">
        ${state.teams.map((team, index) => `
          <div class="team-pill">
            <span class="team-seed">${index + 1}</span>
            <div class="entrant-stack">
              <p class="team-label">${state.teamMode === "pairs" ? `Koppel ${index + 1}` : `Speler ${index + 1}`}</p>
              ${renderMemberBlock(team.members)}
            </div>
          </div>
        `).join("")}
      </div>
    `;
  }

  function renderPools() {
    if (!state.pools.length) {
      els.poolsPanel.innerHTML = "<p class=\"muted draw-empty\">Nog geen loting gemaakt.</p>";
      return;
    }
    els.poolsPanel.innerHTML = state.pools.map((pool) => `
      <article class="pool-card">
        <h3>${escapeHtml(pool.name)}</h3>
        <div class="pool-dropzone" data-pool-id="${pool.id}">
          ${pool.entrants.map((entrantId) => renderEntrantChip(entrantId)).join("")}
        </div>
      </article>
    `).join("");
    bindDragAndDrop();
  }

  function renderEntrantChip(entrantId) {
    const entrant = findEntrant(entrantId);
    const members = entrant ? entrant.members : [entrantId];
    return `
      <div class="player-chip" draggable="${isAdmin() && state.stage === "draw"}" data-entrant-id="${entrantId}">
        ${renderMemberBlock(members)}
      </div>
    `;
  }

  function renderMemberBlock(members) {
    return `
      <div class="entrant-names">
        ${members.map((name) => `<span class="member-chip">${escapeHtml(name)}</span>`).join("")}
      </div>
    `;
  }

  function bindDragAndDrop() {
    let draggedId = null;
    document.querySelectorAll(".player-chip").forEach((chip) => {
      chip.addEventListener("dragstart", () => {
        if (!(isAdmin() && state.stage === "draw")) return;
        draggedId = chip.dataset.entrantId;
      });
    });
    document.querySelectorAll(".pool-dropzone").forEach((zone) => {
      zone.addEventListener("dragover", (event) => {
        if (!(isAdmin() && state.stage === "draw")) return;
        event.preventDefault();
        zone.classList.add("over");
      });
      zone.addEventListener("dragleave", () => zone.classList.remove("over"));
      zone.addEventListener("drop", (event) => {
        event.preventDefault();
        zone.classList.remove("over");
        if (!draggedId || !(isAdmin() && state.stage === "draw")) return;
        state.pools.forEach((pool) => {
          pool.entrants = pool.entrants.filter((id) => id !== draggedId);
        });
        const targetPool = state.pools.find((pool) => pool.id === zone.dataset.poolId);
        if (!targetPool) return;
        targetPool.entrants.push(draggedId);
        saveState();
        renderPools();
      });
    });
  }

  function renderMatches() {
    const ordered = orderedMatches();
    const liveSlots = boardUtils.getBoardLiveSlots(ordered, boardCount);
    const queue = tournamentViewModels.buildMatchQueue(ordered, boardCount);
    const poolProgress = tournamentViewModels.buildPoolProgressSummary(state.matches);
    const knockoutStatus = tournamentViewModels.buildKnockoutStatus(state.matches);
    const highlightedMatchIds = new Set(
      liveSlots
        .filter((slot) => slot.match)
        .map((slot) => slot.match.id)
    );

    renderHomeMatchQueue(queue);
    renderPoolProgress(poolProgress);
    renderHomeKnockoutStatus(knockoutStatus);
    els.livePanel.innerHTML = `
      ${liveSlots.map((slot) => renderLiveBoardSlot(slot)).join("")}
    `;

    if (!state.matches.length) {
      els.matchSections.innerHTML = "<div class=\"panel\"><p class=\"muted\">Na de loting verschijnen hier de wedstrijden.</p></div>";
      return;
    }

    const preview = bracketPreview();
    const groups = [
      { key: "pool", title: "Poulewedstrijden" },
      { key: "tiebreak", title: "Beslissende legs" },
      { key: "semi", title: "Halve finales" },
      { key: "final", title: "Finale" }
    ];

    const bracketIntro = (state.matches.some((match) => match.phase === "semi") || poolPhaseFinished())
      ? `
          <section class="panel">
            <div class="section-heading compact">
              <h3>Vervolg na de poules</h3>
            </div>
            <div class="knockout-grid">
              <div class="bracket-column">
                <h3>Halve finales</h3>
                ${preview.semis.map((semi) => renderBracketSlot(semi)).join("")}
              </div>
              <div class="bracket-column">
                <h3>Finale</h3>
                ${renderBracketSlot(preview.final)}
              </div>
              <div class="bracket-column">
                <h3>Status</h3>
                <div class="bracket-slot">
                  <strong>Routing</strong>
                  <div>${escapeHtml(preview.status)}</div>
                </div>
              </div>
            </div>
          </section>
        `
      : "";

    els.matchSections.innerHTML = bracketIntro + groups
      .map((group) => {
        const matches = ordered.filter((match) => match.phase === group.key);
        if (!matches.length) return "";
        return `
          <section class="match-group">
            <h3>${group.title}</h3>
            <div class="match-list">
              ${matches.map((match) => renderMatchCard(match, highlightedMatchIds)).join("")}
            </div>
          </section>
        `;
      })
      .join("");

    bindMatchInputs();
  }

  function renderHomeMatchQueue(queue) {
    const section = (title, matches) => `
      <div class="queue-block">
        <p class="queue-label">${title}</p>
        ${matches.length
          ? matches.map((match) => `
              <article class="queue-card">
                <strong>${escapeHtml(matchName(match))}</strong>
                <span class="match-meta">${escapeHtml(match.roundName)} &middot; Bord ${match.board}</span>
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
        <div class="match-meta">${escapeHtml(slot.match.roundName)} &middot; Best of ${slot.match.targetLegs}</div>
      </article>
    `;
  }

  function renderMatchCard(match, highlightedMatchIds) {
    const readonly = !canEditMatch(match) ? "disabled" : "";
    const isBoardHighlight = highlightedMatchIds.has(match.id);
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
  }

  function bindMatchInputs() {
    document.querySelectorAll(".match-card").forEach((card) => {
      const match = state.matches.find((item) => item.id === card.dataset.matchId);
      if (!match) return;
      const scoreAInput = card.querySelector(".score-a");
      const scoreBInput = card.querySelector(".score-b");
      const tryCommitScore = () => {
        const result = validateScoreInput(match, scoreAInput.value, scoreBInput.value);
        if (!result.valid) return;
        commitMatchScore(match, result.scoreA, result.scoreB);
      };
      scoreAInput.addEventListener("change", tryCommitScore);
      scoreBInput.addEventListener("change", tryCommitScore);
      scoreAInput.addEventListener("blur", tryCommitScore);
      scoreBInput.addEventListener("blur", tryCommitScore);
      scoreAInput.addEventListener("keydown", (event) => {
        if (event.key === "Enter") tryCommitScore();
      });
      scoreBInput.addEventListener("keydown", (event) => {
        if (event.key === "Enter") tryCommitScore();
      });
    });
  }

  function syncTournamentProgress() {
    ensureTieBreakMatches();
    if (state.mode === "pool-knockout" && poolPhaseFinished() && !hasUnresolvedTies()) {
      ensureSemifinals();
      ensureFinal();
    }
  }

  function ensureTieBreakMatches() {
    state.pools.forEach((pool) => {
      const regularMatches = state.matches.filter((match) => match.poolId === pool.id && match.phase === "pool");
      if (!regularMatches.length || regularMatches.some((match) => match.status !== "done")) return;
      const summary = calculateStandings(pool);
      summary.tieGroups.forEach((group) => {
        if (group.ids.length !== 2) return;
        const existing = findTiebreakMatch(pool.id, group.ids);
        if (!existing) {
          const [entrantA, entrantB] = group.ids;
          state.matches.push(makeMatch({
            id: `tiebreak-${pool.id}-${group.ids.sort().join("-")}`,
            poolId: pool.id,
            phase: "tiebreak",
            roundName: `${pool.name} beslissende leg`,
            entrantA,
            entrantB,
            board: ((state.matches.filter((match) => match.phase === "tiebreak").length % boardCount) + 1),
            sortIndex: state.matches.length,
            targetLegs: 1
          }));
        }
      });
    });
    state.matches = orderedMatches();
  }

  function ensureSemifinals() {
    if (state.matches.some((match) => match.phase === "semi")) return;
    const semiPairs = semifinalPairs();
    if (!semiPairs.length) return;
    semiPairs.forEach((pair, index) => {
      state.matches.push(makeMatch({
        id: `semi-${index + 1}`,
        poolId: "knockout",
        phase: "semi",
        roundName: `Halve finale ${index + 1}`,
        entrantA: pair[0],
        entrantB: pair[1],
        board: index + 1,
        sortIndex: state.matches.length,
        targetLegs: state.legsTarget
      }));
    });
    state.matches = orderedMatches();
  }

  function ensureFinal() {
    const semiMatches = state.matches.filter((match) => match.phase === "semi");
    if (semiMatches.length < 2 || semiMatches.some((match) => match.status !== "done")) return;
    const winners = semiMatches.map((match) => winnerId(match));
    const finalMatch = state.matches.find((match) => match.phase === "final");
    if (finalMatch) {
      finalMatch.entrantA = winners[0];
      finalMatch.entrantB = winners[1];
      return;
    }
    state.matches.push(makeMatch({
      id: "final-1",
      poolId: "knockout",
      phase: "final",
      roundName: "Finale",
      entrantA: winners[0],
      entrantB: winners[1],
      board: 1,
      sortIndex: state.matches.length,
      targetLegs: state.legsTarget
    }));
    state.matches = orderedMatches();
  }

  function poolPhaseFinished() {
    const regular = state.matches.filter((match) => match.phase === "pool");
    const tiebreaks = state.matches.filter((match) => match.phase === "tiebreak");
    if (!regular.length || regular.some((match) => match.status !== "done")) return false;
    return tiebreaks.every((match) => match.status === "done");
  }

  function hasUnresolvedTies() {
    return state.pools.some((pool) => calculateStandings(pool).tieGroups.length > 0);
  }

  function semifinalPairs() {
    if (state.mode !== "pool-knockout") return [];
    if (state.poolCount === 2) {
      if (state.pools.length < 2) return [];
      const poolA = calculateStandings(state.pools[0]).rows;
      const poolB = calculateStandings(state.pools[1]).rows;
      if (poolA.length < 2 || poolB.length < 2) return [];
      return [
        [poolA[0].id, poolB[1].id],
        [poolB[0].id, poolA[1].id]
      ];
    }
    const rows = calculateStandings(state.pools[0]).rows;
    if (rows.length < 4) return [];
    return [
      [rows[0].id, rows[3].id],
      [rows[1].id, rows[2].id]
    ];
  }

  function renderStandings() {
    if (!state.pools.length) {
      els.standingsPanel.innerHTML = "<div class=\"panel\"><p class=\"muted\">Nog geen standen beschikbaar.</p></div>";
      els.knockoutPanel.innerHTML = "<p class=\"muted\">Na de poules verschijnt hier de knock-outboom.</p>";
      els.winnerPanel.innerHTML = "<p class=\"muted\">De winnaar verschijnt hier zodra de finale is afgerond.</p>";
      return;
    }

    els.standingsPanel.innerHTML = `
      <div class="standings-grid">
        ${state.pools.map(renderPoolStanding).join("")}
      </div>
    `;
    renderKnockoutBracket();
    renderWinnerPanel();
  }

  function renderPoolStanding(pool) {
    const summary = calculateStandings(pool);
    return `
      <article class="standing-card">
        <h3>${escapeHtml(pool.name)}</h3>
        <table>
          <thead>
            <tr><th>#</th><th>Naam</th><th>P</th><th>W</th><th>V</th><th>Legs</th><th>Saldo</th></tr>
          </thead>
          <tbody>
            ${summary.rows.map((row, index) => `
              <tr>
                <td data-label="#">${index + 1}</td>
                <td data-label="Naam">${escapeHtml(row.name)}</td>
                <td data-label="P">${row.points}</td>
                <td data-label="W">${row.wins}</td>
                <td data-label="V">${row.losses}</td>
                <td data-label="Legs">${row.legsFor}-${row.legsAgainst}</td>
                <td data-label="Saldo">${row.diff}</td>
              </tr>
            `).join("")}
          </tbody>
        </table>
        ${summary.tieNotice ? `<div class="tie-alert">${escapeHtml(summary.tieNotice)}</div>` : ""}
      </article>
    `;
  }

  function renderKnockoutBracket() {
    const preview = bracketPreview();
    els.knockoutPanel.innerHTML = `
      <div class="section-heading compact">
        <h3>Knock-outfase</h3>
      </div>
      <div class="knockout-grid">
        <div class="bracket-column">
          <h3>Halve finales</h3>
          ${preview.semis.map((semi) => renderBracketSlot(semi)).join("")}
        </div>
        <div class="bracket-column">
          <h3>Finale</h3>
          ${renderBracketSlot(preview.final)}
        </div>
        <div class="bracket-column">
          <h3>Status</h3>
          <div class="bracket-slot">
            <strong>Plaatsing</strong>
            <span>${escapeHtml(preview.status)}</span>
          </div>
        </div>
      </div>
    `;
  }

  function renderBracketSlot(item) {
    return `
      <div class="bracket-slot">
        <strong>${escapeHtml(item.title)}</strong>
        <div>${escapeHtml(item.a)}</div>
        <div>${escapeHtml(item.b)}</div>
        ${item.score ? `<div class="muted">${escapeHtml(item.score)}</div>` : ""}
      </div>
    `;
  }

  function bracketPreview() {
    const semiMatches = state.matches.filter((match) => match.phase === "semi");
    const finalMatch = state.matches.find((match) => match.phase === "final");
    const provisionalSemis = semifinalPairs().map((pair, index) => ({
      title: `Halve finale ${index + 1}`,
      a: entrantName(pair[0]),
      b: entrantName(pair[1])
    }));

    const semis = semiMatches.length
      ? semiMatches.map((match) => ({
          title: match.roundName,
          a: entrantName(match.entrantA),
          b: entrantName(match.entrantB),
          score: match.status === "done" ? `${match.scoreA}-${match.scoreB}` : "Nog te spelen"
        }))
      : provisionalSemis.length
        ? provisionalSemis
        : [
            { title: "Halve finale 1", a: "Nog niet bepaald", b: "Nog niet bepaald" },
            { title: "Halve finale 2", a: "Nog niet bepaald", b: "Nog niet bepaald" }
          ];

    const final = finalMatch
      ? {
          title: "Finale",
          a: entrantName(finalMatch.entrantA),
          b: entrantName(finalMatch.entrantB),
          score: finalMatch.status === "done" ? `${finalMatch.scoreA}-${finalMatch.scoreB}` : "Nog te spelen"
        }
      : {
          title: "Finale",
          a: semiMatches[0]?.status === "done" ? entrantName(winnerId(semiMatches[0])) : "Winnaar halve finale 1",
          b: semiMatches[1]?.status === "done" ? entrantName(winnerId(semiMatches[1])) : "Winnaar halve finale 2",
          score: "Wacht op halve finales"
        };

    let status = "De bracket vult zich automatisch op basis van de poulestanden.";
    if (hasUnresolvedTies()) {
      status = "Eerst de beslissende leg spelen voor volledig gelijke standen.";
    } else if (poolPhaseFinished()) {
      status = "Halve finales zijn bepaald.";
    }

    return { semis, final, status };
  }

  function renderWinnerPanel() {
    const finalMatch = state.matches.find((match) => match.phase === "final");
    if (!finalMatch || finalMatch.status !== "done") {
      els.winnerPanel.innerHTML = `
        <div class="section-heading compact">
          <h3>Toernooiwinnaar</h3>
        </div>
        <p class="muted">De winnaar verschijnt hier zodra de finale is afgerond.</p>
      `;
      return;
    }
    const winner = entrantName(winnerId(finalMatch));
    els.winnerPanel.innerHTML = `
      <div class="section-heading compact">
        <h3>Toernooiwinnaar</h3>
      </div>
      <div class="winner-card">
        <div class="winner-badge">1</div>
        <div>
          <p class="eyebrow">Kampioen</p>
          <strong>${escapeHtml(winner)}</strong>
          <div class="winner-subtitle">Won de finale met ${finalMatch.scoreA}-${finalMatch.scoreB} op bord ${finalMatch.board}.</div>
        </div>
      </div>
    `;
  }

  function calculateStandings(pool) {
    const rows = new Map(pool.entrants.map((id) => [id, {
      id,
      name: entrantName(id),
      points: 0,
      wins: 0,
      losses: 0,
      legsFor: 0,
      legsAgainst: 0,
      diff: 0,
      tieBoost: 0
    }]));

    state.matches
      .filter((match) => match.poolId === pool.id && match.phase === "pool" && match.status === "done")
      .forEach((match) => {
        const rowA = rows.get(match.entrantA);
        const rowB = rows.get(match.entrantB);
        if (!rowA || !rowB) return;
        rowA.legsFor += Number(match.scoreA);
        rowA.legsAgainst += Number(match.scoreB);
        rowB.legsFor += Number(match.scoreB);
        rowB.legsAgainst += Number(match.scoreA);
        if (Number(match.scoreA) > Number(match.scoreB)) {
          rowA.wins += 1;
          rowA.points += 2;
          rowB.losses += 1;
        } else {
          rowB.wins += 1;
          rowB.points += 2;
          rowA.losses += 1;
        }
      });

    Array.from(rows.values()).forEach((row) => {
      row.diff = row.legsFor - row.legsAgainst;
    });

    const tieGroups = [];
    const groupsByKey = {};
    Array.from(rows.values()).forEach((row) => {
      const key = `${row.points}|${row.diff}|${row.legsFor}`;
      groupsByKey[key] = groupsByKey[key] || [];
      groupsByKey[key].push(row);
    });

    Object.values(groupsByKey).forEach((group) => {
      if (group.length < 2) return;
      if (group.length === 2) {
        const tieMatch = findTiebreakMatch(pool.id, group.map((item) => item.id));
        if (tieMatch && tieMatch.status === "done") {
          rows.get(winnerId(tieMatch)).tieBoost = 1;
          rows.get(loserId(tieMatch)).tieBoost = -1;
        } else {
          tieGroups.push({ ids: group.map((item) => item.id) });
        }
      } else {
        tieGroups.push({ ids: group.map((item) => item.id) });
      }
    });

    const sortedRows = Array.from(rows.values()).sort((a, b) =>
      b.points - a.points ||
      b.diff - a.diff ||
      b.legsFor - a.legsFor ||
      b.tieBoost - a.tieBoost ||
      a.name.localeCompare(b.name)
    );

    const tieNotice = tieGroups.length
      ? tieGroups.map((group) => `Beslissende leg nodig: ${group.ids.map(entrantName).join(" vs ")}`).join(" | ")
      : "";

    return { rows: sortedRows, tieGroups, tieNotice };
  }

  function renderAccess() {
    const links = ["admin", "scorer", "viewer"].map((item) => `
      <div class="team-pill">
        <strong>${roleLabel(item)}</strong>
        <span>${escapeHtml(roleLink(item))}</span>
      </div>
    `).join("");
    els.shareLinks.innerHTML = `<h3>Deellinks</h3><div class="teams-list">${links}</div>`;
  }

  function applyRole() {
    els.roleBadge.textContent = roleLabel(role);
    document.querySelectorAll("#setup input, #setup select").forEach((element) => {
      element.disabled = !(isAdmin() && state.stage === "setup");
    });
    document.getElementById("saveSetupBtn").disabled = !(isAdmin() && state.stage === "setup");
    document.getElementById("makeDrawBtn").disabled = !(isAdmin() && state.stage === "draw");
    document.getElementById("finalizeDrawBtn").disabled = !(isAdmin() && state.stage === "draw");
    document.getElementById("fillPlayersBtn").disabled = !(isAdmin() && state.stage === "setup");
    document.getElementById("resetBtn").disabled = !isAdmin();
  }

  function navigate(view) {
    const allowed = allowedViews();
    const target = allowed.includes(view) ? view : allowed[0];
    activeView = target;
    document.querySelectorAll(".view").forEach((section) => {
      section.classList.toggle("active", section.id === target);
    });
    renderStepper();
  }

  function allowedViews() {
    if (state.stage === "setup") return ["setup"];
    if (state.stage === "draw") return ["draw"];
    return ["matches", "standings"];
  }

  function orderedMatches() {
    return [...state.matches].sort(boardUtils.compareMatches);
  }

  function canEditMatch(match) {
    if (isViewer()) return false;
    if (isAdmin()) return true;
    return match.phase !== "final";
  }

  function winnerId(match) {
    return Number(match.scoreA) > Number(match.scoreB) ? match.entrantA : match.entrantB;
  }

  function loserId(match) {
    return Number(match.scoreA) > Number(match.scoreB) ? match.entrantB : match.entrantA;
  }

  function findTiebreakMatch(poolId, entrantIds) {
    const signature = [...entrantIds].sort().join(":");
    return state.matches.find((match) =>
      match.poolId === poolId &&
      match.phase === "tiebreak" &&
      [match.entrantA, match.entrantB].sort().join(":") === signature
    );
  }

  function findEntrant(id) {
    return state.teams.find((team) => team.id === id);
  }

  function entrantName(id) {
    return findEntrant(id)?.name || id || "Nog niet bepaald";
  }

  function matchName(match) {
    return `${entrantName(match.entrantA)} vs ${entrantName(match.entrantB)}`;
  }

  function openSettings() {
    els.settingsModal.classList.remove("hidden");
    els.settingsModal.setAttribute("aria-hidden", "false");
  }

  function closeSettings() {
    els.settingsModal.classList.add("hidden");
    els.settingsModal.setAttribute("aria-hidden", "true");
  }

  function exportCsv() {
    const rows = [["Poule", "Naam", "Punten", "Gewonnen", "Verloren", "Legs voor", "Legs tegen", "Saldo"]];
    state.pools.forEach((pool) => {
      calculateStandings(pool).rows.forEach((row) => {
        rows.push([pool.name, row.name, row.points, row.wins, row.losses, row.legsFor, row.legsAgainst, row.diff]);
      });
    });
    const csv = rows.map((row) => row.map((cell) => `"${String(cell).replaceAll("\"", "\"\"")}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${slug(state.name)}-standen.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  function roleLink(nextRole) {
    const url = new URL(location.href);
    url.searchParams.set("role", nextRole);
    return url.toString();
  }

  function copyText(value) {
    if (!navigator.clipboard) {
      prompt("Kopieer deze link", value);
      return;
    }
    navigator.clipboard.writeText(value).then(() => toast("Link gekopieerd")).catch(() => {
      prompt("Kopieer deze link", value);
    });
  }

  function toast(message) {
    els.toast.textContent = message;
    els.toast.classList.add("show");
    setTimeout(() => els.toast.classList.remove("show"), 2200);
  }

  function validateScoreInput(match, rawA, rawB) {
    if (!canEditMatch(match)) return { valid: false };
    if (rawA === "" || rawB === "") return { valid: false };
    const scoreA = Number(rawA);
    const scoreB = Number(rawB);
    if (!Number.isFinite(scoreA) || !Number.isFinite(scoreB)) return { valid: false };
    if (scoreA === scoreB) return { valid: false };
    if (scoreA > match.targetLegs || scoreB > match.targetLegs) return { valid: false };
    return { valid: true, scoreA, scoreB };
  }

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

  function shuffle(items) {
    const copy = [...items];
    for (let index = copy.length - 1; index > 0; index -= 1) {
      const swapIndex = Math.floor(Math.random() * (index + 1));
      [copy[index], copy[swapIndex]] = [copy[swapIndex], copy[index]];
    }
    return copy;
  }

  function chunk(items, size) {
    const groups = [];
    for (let index = 0; index < items.length; index += size) {
      groups.push(items.slice(index, index + size));
    }
    return groups;
  }

  function isAdmin() {
    return role === "admin";
  }

  function isViewer() {
    return role === "viewer";
  }

  function roleLabel(value) {
    return value === "scorer" ? "Scorer" : value === "viewer" ? "Toeschouwer" : "Admin";
  }

  function slug(value) {
    return String(value)
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "") || "item";
  }

  function escapeHtml(value) {
    return String(value)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }
})();
