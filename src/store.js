/* ============================================================
   store.js — the single in-memory copy of data/casa.json.
   main.jsx calls setData() after fetch, BEFORE the first render,
   so components can read S.* synchronously (as the prototype read
   the window.* globals).
   ============================================================ */

export const S = {
  house: { name: "Casa da Costa", location: "", capacity: 0, blackouts: [] },
  pipeline: { scanned: 0, extracted: 0, needsReview: 0, lastSync: null },
  people: [],
  thread: [],
  entries: [],
  presence: [],
};

let _byId = new Map();

export function setData(json) {
  Object.assign(S, json);
  _byId = new Map((S.thread || []).map((m) => [m.id, m]));
}

// Look up a thread message by id (was window.msg).
export const msg = (id) => _byId.get(id) || null;

// Resolve a raw WhatsApp sender string to a person color index via the
// people[] registry (canonical name + aliases). Generalizes the old colorFor.
export function colorForSender(sender) {
  if (!sender) return 8;
  const hit = S.people.find(
    (p) => p.name === sender || (p.aliases || []).includes(sender)
  );
  if (hit) return hit.color;
  // loose fallback: first-name / prefix match
  const loose = S.people.find(
    (p) =>
      sender.startsWith(p.name) ||
      (p.aliases || []).some((a) => sender.startsWith(a))
  );
  return loose ? loose.color : 8;
}
