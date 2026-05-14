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
