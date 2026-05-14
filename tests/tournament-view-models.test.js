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

test("buildKnockoutStatus reports semifinal activity when semis exist without a final", () => {
  const status = buildKnockoutStatus([
    { phase: "semi", status: "planned" },
    { phase: "semi", status: "planned" }
  ]);

  assert.equal(status.title, "Halve finales actief");
});

test("buildKnockoutStatus reports finished final state", () => {
  const status = buildKnockoutStatus([
    { phase: "semi", status: "done" },
    { phase: "semi", status: "done" },
    { phase: "final", status: "done" }
  ]);

  assert.equal(status.title, "Finale in beeld");
  assert.match(status.body, /afgerond/i);
});
