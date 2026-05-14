const test = require("node:test");
const assert = require("node:assert/strict");
const {
  compareMatches,
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

test("getBoardLiveSlots can show both boards at once when both have pending matches", () => {
  const matches = [
    { id: "m1", board: 1, status: "planned", phase: "pool", roundName: "Poule A" },
    { id: "m2", board: 2, status: "planned", phase: "pool", roundName: "Poule B" }
  ];

  const slots = getBoardLiveSlots(matches, 2);

  assert.equal(slots[0].match.id, "m1");
  assert.equal(slots[1].match.id, "m2");
});

test("compareMatches keeps explicit schedule order before board grouping", () => {
  const matches = [
    { id: "m2", board: 2, status: "planned", phase: "pool", roundName: "Poule A", sortIndex: 1 },
    { id: "m1", board: 1, status: "planned", phase: "pool", roundName: "Poule A", sortIndex: 0 },
    { id: "m4", board: 2, status: "planned", phase: "pool", roundName: "Poule A", sortIndex: 3 },
    { id: "m3", board: 1, status: "planned", phase: "pool", roundName: "Poule A", sortIndex: 2 }
  ];

  const ordered = [...matches].sort(compareMatches).map((match) => match.id);

  assert.deepEqual(ordered, ["m1", "m2", "m3", "m4"]);
});

test("getBoardLiveSlots returns explicit idle slots when there are no matches", () => {
  const slots = getBoardLiveSlots([], 2);

  assert.equal(slots.length, 2);
  assert.equal(slots[0].match, null);
  assert.equal(slots[1].match, null);
  assert.equal(slots[0].state, "idle");
  assert.equal(slots[1].state, "idle");
});
