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
      (a.sortIndex ?? Number.MAX_SAFE_INTEGER) - (b.sortIndex ?? Number.MAX_SAFE_INTEGER) ||
      String(a.roundName || "").localeCompare(String(b.roundName || "")) ||
      (a.board || 0) - (b.board || 0) ||
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
