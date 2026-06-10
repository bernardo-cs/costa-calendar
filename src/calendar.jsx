/* ============================================================
   calendar.jsx — date utils, shared bits, Month grid, Agenda
   Ported from the design prototype to an ES module: window.* data
   → store S; English copy → PT (i18n).
   ============================================================ */
import React from "react";
import { S } from "./store.js";
import { MONTHS, MON_SHORT, WD_MON, WD_SUN, WD_FULL, T, plural } from "./i18n.js";

const { useMemo, useState, useEffect } = React;

/* ---------- date utils ---------- */
const MS_DAY = 86400000;
export function parseD(s) { const [y, m, d] = s.split("-").map(Number); return new Date(y, m - 1, d); }
export function fmtKey(dt) { return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}-${String(dt.getDate()).padStart(2, "0")}`; }
export function addDays(dt, n) { const x = new Date(dt); x.setDate(x.getDate() + n); return x; }
// Reactive "today" key (local time, YYYY-MM-DD). The day rolls over on its own:
// checked once a minute plus whenever the tab regains focus/visibility, so a
// calendar left open past midnight re-renders onto the new day with no refresh.
let _todayKey = fmtKey(new Date());
const _todaySubs = new Set();
function _syncToday() {
  const k = fmtKey(new Date());
  if (k !== _todayKey) { _todayKey = k; _todaySubs.forEach((fn) => fn(k)); }
}
if (typeof window !== "undefined") {
  setInterval(_syncToday, 60000);
  window.addEventListener("focus", _syncToday);
  document.addEventListener("visibilitychange", () => { if (!document.hidden) _syncToday(); });
}
// Hook: current today-key, re-rendering the caller when the day changes.
export function useToday() {
  const [k, setK] = useState(_todayKey);
  useEffect(() => {
    const fn = (nk) => setK(nk);
    _todaySubs.add(fn);
    if (_todayKey !== k) setK(_todayKey); // catch a rollover between render and mount
    return () => { _todaySubs.delete(fn); };
  }, []);
  return k;
}
export function daysBetween(a, b) { return Math.round((parseD(b) - parseD(a)) / MS_DAY); }
export function nights(e) { return daysBetween(e.start, e.end); }
export { MONTHS, MON_SHORT, WD_FULL };

export function fmtRange(e) {
  const a = parseD(e.start), b = parseD(e.end);
  const sameMonth = a.getMonth() === b.getMonth() && a.getFullYear() === b.getFullYear();
  const left = `${a.getDate()} ${MON_SHORT[a.getMonth()]}`;
  const right = sameMonth ? `${b.getDate()}` : `${b.getDate()} ${MON_SHORT[b.getMonth()]}`;
  return `${left} – ${right}`;
}
export function fmtMsgTime(s) {
  const d = new Date(s);
  return `${String(d.getDate()).padStart(2,"0")}/${String(d.getMonth()+1).padStart(2,"0")} · ${String(d.getHours()).padStart(2,"0")}:${String(d.getMinutes()).padStart(2,"0")}`;
}
export function personVar(i) { return `var(--p${i})`; }

/* ---------- small shared UI ---------- */
export function StatusBadge({ status, review }) {
  const map = {
    confirmed: { label: T.confirmed, c: "var(--sage)" },
    tentative: { label: T.tentative, c: "var(--ochre)" },
    shared: { label: T.sharedStay, c: "var(--brand-ink)" },
  };
  const s = map[status] || map.confirmed;
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12, fontWeight: 600,
      color: review === "conflict" ? "var(--alert)" : s.c,
      letterSpacing: ".01em",
    }}>
      <span style={{ width: 7, height: 7, borderRadius: 99, background: review === "conflict" ? "var(--alert)" : s.c,
        boxShadow: status === "tentative" ? "inset 0 0 0 1.5px var(--ochre)" : "none",
        backgroundColor: status === "tentative" && !review ? "transparent" : undefined }} />
      {review === "conflict" ? T.conflict : s.label}
    </span>
  );
}

export function PersonDot({ i, size = 9 }) {
  return <span style={{ width: size, height: size, borderRadius: 99, background: personVar(i), flex: "0 0 auto", display: "inline-block" }} />;
}

/* find blackout covering a date key */
export function blackoutFor(key) {
  return S.house.blackouts.find((b) => key >= b.start && key <= b.end) || null;
}

/* ============================================================
   MONTH GRID
   ============================================================ */
export function MonthGrid({ year, month, weekStartMon, entries, presence, selectedId, onSelect, onSelectBlackout, density }) {
  const WD = weekStartMon ? WD_MON : WD_SUN;
  const todayKey = useToday();

  const weeks = useMemo(() => {
    const first = new Date(year, month, 1);
    const startOffset = weekStartMon ? ((first.getDay() + 6) % 7) : first.getDay();
    const gridStart = addDays(first, -startOffset);
    const out = [];
    for (let w = 0; w < 6; w++) {
      const row = [];
      for (let d = 0; d < 7; d++) {
        const dt = addDays(gridStart, w * 7 + d);
        row.push({ dt, key: fmtKey(dt), inMonth: dt.getMonth() === month });
      }
      out.push(row);
    }
    while (out.length > 4 && out[out.length - 1].every((c) => !c.inMonth)) out.pop();
    return out;
  }, [year, month, weekStartMon]);

  return (
    <div style={{ background: "var(--card)", border: "1px solid var(--line)", borderRadius: 14, overflow: "hidden", boxShadow: "var(--shadow-sm)" }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", borderBottom: "1px solid var(--line)", background: "var(--paper-2)" }}>
        {WD.map((d, i) => (
          <div key={i} style={{ padding: "10px 12px", fontSize: 11, fontWeight: 700, letterSpacing: ".08em", textTransform: "uppercase",
            color: (weekStartMon ? i >= 5 : i === 0 || i === 6) ? "var(--ink-faint)" : "var(--ink-soft)",
            textAlign: "left", borderRight: i < 6 ? "1px solid var(--line)" : "none" }}>{d}</div>
        ))}
      </div>
      {weeks.map((week, wi) => (
        <WeekRow key={wi} week={week} month={month} entries={entries} presence={presence} selectedId={selectedId}
          onSelect={onSelect} onSelectBlackout={onSelectBlackout} density={density} lastRow={wi === weeks.length - 1} todayKey={todayKey} />
      ))}
    </div>
  );
}

function WeekRow({ week, month, entries, presence, selectedId, onSelect, onSelectBlackout, density, lastRow, todayKey }) {
  const rowH = density === "compact" ? 92 : 116;
  const weekStartKey = week[0].key, weekEndKey = week[6].key;

  const segs = [];
  entries.forEach((e) => {
    const eEndIncl = fmtKey(addDays(parseD(e.end), -1));
    if (e.end <= weekStartKey || e.start > weekEndKey) return;
    let startCol = Math.max(0, daysBetween(weekStartKey, e.start));
    let endCol = Math.min(6, daysBetween(weekStartKey, eEndIncl));
    if (endCol < 0 || startCol > 6) return;
    const clippedStart = e.start < weekStartKey;
    const clippedEnd = eEndIncl > weekEndKey;
    segs.push({ e, startCol, span: endCol - startCol + 1, clippedStart, clippedEnd });
  });

  const blackSegs = [];
  S.house.blackouts.forEach((b) => {
    if (b.end < weekStartKey || b.start > weekEndKey) return;
    const sc = Math.max(0, daysBetween(weekStartKey, b.start));
    const ec = Math.min(6, daysBetween(weekStartKey, b.end));
    blackSegs.push({ b, startCol: sc, span: ec - sc + 1, showLabel: true });
  });

  segs.sort((a, b) => a.startCol - b.startCol || b.span - a.span);
  const lanes = [];
  segs.forEach((s) => {
    let lane = 0;
    while (lanes[lane] && lanes[lane] > s.startCol) lane++;
    s.lane = lane;
    lanes[lane] = s.startCol + s.span;
  });
  const maxLanes = density === "compact" ? 2 : 3;

  const presSegs = [];
  (presence || []).forEach((e) => {
    const eEndIncl = fmtKey(addDays(parseD(e.end), -1));
    if (e.end <= weekStartKey || e.start > weekEndKey) return;
    const startCol = Math.max(0, daysBetween(weekStartKey, e.start));
    const endCol = Math.min(6, daysBetween(weekStartKey, eEndIncl));
    if (endCol < 0 || startCol > 6) return;
    presSegs.push({ e, startCol, span: endCol - startCol + 1,
      clippedStart: e.start < weekStartKey, clippedEnd: eEndIncl > weekEndKey });
  });
  presSegs.sort((a, b) => a.startCol - b.startCol || b.span - a.span);
  const pLanes = [];
  presSegs.forEach((s) => {
    let lane = 0;
    while (pLanes[lane] && pLanes[lane] > s.startCol) lane++;
    s.lane = lane;
    pLanes[lane] = s.startCol + s.span;
  });
  const hasBlack = blackSegs.length > 0;
  const step = density === "compact" ? 22 : 25;
  const presLaneCount = presSegs.length ? Math.min(maxLanes, Math.max(...presSegs.map((s) => s.lane)) + 1) : 0;
  const effH = hasBlack ? Math.max(rowH, 62 + presLaneCount * step + 8) : rowH;

  return (
    <div style={{ position: "relative", display: "grid", gridTemplateColumns: "repeat(7,1fr)",
      borderBottom: lastRow ? "none" : "1px solid var(--line)", minHeight: effH }}>
      {week.map((c, ci) => {
        const blk = blackoutFor(c.key);
        const today = c.key === todayKey;
        return (
          <div key={ci}
            className={blk ? "hatch" : ""}
            onClick={() => blk && onSelectBlackout(blk)}
            style={{
              borderRight: ci < 6 ? "1px solid var(--line)" : "none",
              padding: "7px 9px", position: "relative",
              background: blk ? undefined : (today ? "color-mix(in oklch, var(--brand) 7%, transparent)" : (c.inMonth ? "transparent" : "var(--paper-2)")),
              cursor: blk ? "pointer" : "default",
              opacity: c.inMonth ? 1 : 0.55,
            }}>
            {today ? (
              <span style={{ display: "inline-flex", alignItems: "center", justifyContent: "center",
                minWidth: 21, height: 21, padding: "0 6px", borderRadius: 99,
                background: "var(--brand)", color: "#fff", fontFamily: "var(--font-mono)", fontSize: 12.5, fontWeight: 700 }}>
                {c.dt.getDate()}
              </span>
            ) : (
              <span style={{
                fontSize: 12.5, fontWeight: 600,
                fontFamily: "var(--font-mono)",
                color: blk ? "var(--brand-ink)" : (c.inMonth ? "var(--ink-soft)" : "var(--ink-faint)"),
              }}>{c.dt.getDate()}{c.dt.getDate() === 1 ? <span style={{ fontFamily: "var(--font-ui)", fontWeight: 600 }}> {MON_SHORT[c.dt.getMonth()]}</span> : null}</span>
            )}
          </div>
        );
      })}

      {blackSegs.map((s, i) => (
        <div key={"b" + i} onClick={() => onSelectBlackout(s.b)}
          style={{ position: "absolute", top: 34,
            left: `calc(${(s.startCol / 7) * 100}% + 5px)`, width: `calc(${(s.span / 7) * 100}% - 10px)`,
            display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", zIndex: 1 }}>
          {s.showLabel && (
            <span style={{ fontSize: 11, fontWeight: 700, color: "var(--brand-ink)", letterSpacing: ".02em",
              display: "inline-flex", alignItems: "center", gap: 6, padding: "3px 9px",
              background: "var(--paper)", border: "1px dashed var(--brand)", borderRadius: 99, whiteSpace: "nowrap" }}>
              <LockGlyph /> {T.houseClosedSummer}
            </span>
          )}
        </div>
      ))}

      {hasBlack && (
        <div style={{ position: "absolute", inset: 0, top: 62, padding: "0 4px", pointerEvents: "none" }}>
          {presSegs.filter((s) => s.lane < maxLanes).map((s, i) => {
            const sel = s.e.id === selectedId;
            return (
              <div key={i} onClick={() => onSelect(s.e.id)}
                title={`${s.e.who} — presença com a família`}
                style={{
                  pointerEvents: "auto", position: "absolute",
                  left: `calc(${(s.startCol / 7) * 100}% + 4px)`,
                  width: `calc(${(s.span / 7) * 100}% - 8px)`,
                  top: s.lane * step, height: density === "compact" ? 19 : 21,
                  display: "flex", alignItems: "center", gap: 6, padding: "0 4px 0 6px",
                  borderRadius: 99,
                  background: `color-mix(in oklch, ${personVar(s.e.color)} 20%, var(--paper))`,
                  border: `1px solid color-mix(in oklch, ${personVar(s.e.color)} 32%, transparent)`,
                  boxShadow: sel ? `0 0 0 2px var(--paper), 0 0 0 3.5px ${personVar(s.e.color)}` : "none",
                  cursor: "pointer", overflow: "hidden", transition: "box-shadow .12s",
                }}>
                <span style={{ width: 6, height: 6, borderRadius: 99, background: personVar(s.e.color), flex: "0 0 auto" }} />
                <span style={{ fontSize: 11, fontWeight: 600, color: "var(--ink)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                  {s.clippedStart ? "… " : ""}{s.e.who.split(" ").slice(-1)[0]}
                </span>
              </div>
            );
          })}
          {(() => {
            const overflow = {};
            presSegs.filter((s) => s.lane >= maxLanes).forEach((s) => {
              for (let c = s.startCol; c < s.startCol + s.span; c++) overflow[c] = (overflow[c] || 0) + 1;
            });
            return Object.entries(overflow).map(([col, n]) => (
              <div key={"po" + col} style={{ position: "absolute", left: `calc(${(col / 7) * 100}% + 6px)`,
                top: maxLanes * step, fontSize: 10.5, fontWeight: 700, color: "var(--brand-ink)" }}>+{n}</div>
            ));
          })()}
        </div>
      )}

      <div style={{ position: "absolute", inset: 0, top: 30, padding: "0 4px", pointerEvents: "none" }}>
        {segs.filter((s) => s.lane < maxLanes).map((s, i) => {
          const sel = s.e.id === selectedId;
          const isReview = !!s.e.review;
          const isConf = s.e.status === "confirmed";
          return (
            <div key={i} onClick={() => onSelect(s.e.id)}
              style={{
                pointerEvents: "auto", position: "absolute",
                left: `calc(${(s.startCol / 7) * 100}% + 4px)`,
                width: `calc(${(s.span / 7) * 100}% - 8px)`,
                top: s.lane * (density === "compact" ? 22 : 25),
                height: density === "compact" ? 19 : 21,
                display: "flex", alignItems: "center", gap: 6, padding: "0 8px",
                borderRadius: 7,
                borderTopLeftRadius: s.clippedStart ? 0 : 7, borderBottomLeftRadius: s.clippedStart ? 0 : 7,
                borderTopRightRadius: s.clippedEnd ? 0 : 7, borderBottomRightRadius: s.clippedEnd ? 0 : 7,
                background: isConf ? `color-mix(in oklch, ${personVar(s.e.color)} 16%, var(--card))` : "var(--card)",
                border: isConf ? `1px solid color-mix(in oklch, ${personVar(s.e.color)} 38%, transparent)`
                  : `1.5px dashed ${isReview ? "var(--alert)" : "var(--ochre)"}`,
                boxShadow: sel ? `0 0 0 2px var(--paper), 0 0 0 3.5px ${isReview ? "var(--alert)" : personVar(s.e.color)}` : "none",
                cursor: "pointer", overflow: "hidden", transition: "box-shadow .12s",
              }}>
              <span style={{ width: 6, height: 6, borderRadius: 99, background: personVar(s.e.color), flex: "0 0 auto" }} />
              <span style={{ fontSize: 11.5, fontWeight: 600, color: "var(--ink)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                {s.clippedStart ? "… " : ""}{s.e.who}{isReview ? " ⚠" : ""}
              </span>
            </div>
          );
        })}
        {(() => {
          const overflow = {};
          segs.filter((s) => s.lane >= maxLanes).forEach((s) => {
            for (let c = s.startCol; c < s.startCol + s.span; c++) overflow[c] = (overflow[c] || 0) + 1;
          });
          return Object.entries(overflow).map(([col, n]) => (
            <div key={"o" + col} style={{ position: "absolute", left: `calc(${(col / 7) * 100}% + 6px)`,
              top: maxLanes * (density === "compact" ? 22 : 25), fontSize: 10.5, fontWeight: 700, color: "var(--ink-faint)" }}>+{n}</div>
          ));
        })()}
      </div>
    </div>
  );
}

export function LockGlyph() {
  return (
    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" style={{ flex: "0 0 auto" }}>
      <rect x="4" y="10" width="16" height="11" rx="2.5" fill="currentColor" opacity="0.85" />
      <path d="M7.5 10V7.5a4.5 4.5 0 0 1 9 0V10" stroke="currentColor" strokeWidth="2" fill="none" />
    </svg>
  );
}

/* ============================================================
   AGENDA (vertical list grouped by month)
   ============================================================ */
function monthGroups(items) {
  const groups = [];
  items.forEach((it) => {
    const d = parseD(it.date);
    const label = `${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
    let g = groups[groups.length - 1];
    if (!g || g.label !== label) { g = { label, items: [] }; groups.push(g); }
    g.items.push(it);
  });
  return groups;
}

function AgendaMonth({ g, selectedId, onSelect, onSelectBlackout }) {
  return (
    <div>
      <div className="serif" style={{ fontSize: 19, fontWeight: 500, color: "var(--ink)", marginBottom: 10, display: "flex", alignItems: "baseline", gap: 10 }}>
        {g.label}
        <span style={{ flex: 1, height: 1, background: "var(--line)" }} />
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {g.items.map((it, i) =>
          it.kind === "blk" ? (
            <div key={i}>
              <button onClick={() => onSelectBlackout(it.b)} className="hatch"
                style={{ textAlign: "left", border: "1px dashed var(--brand)", borderRadius: 11, padding: "14px 16px",
                  cursor: "pointer", font: "inherit", display: "flex", alignItems: "center", gap: 12, width: "100%" }}>
                <span style={{ color: "var(--brand-ink)" }}><LockGlyph /></span>
                <div>
                  <div style={{ fontWeight: 700, color: "var(--brand-ink)" }}>{T.houseClosed} · {it.b.label}</div>
                  <div style={{ fontSize: 12.5, color: "var(--ink-soft)" }}>{fmtRange({ start: it.b.start, end: it.b.end })} — {it.b.detail}</div>
                </div>
              </button>
              {it.around && it.around.length > 0 && (
                <div style={{ paddingLeft: 18, marginTop: 8 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: ".06em", textTransform: "uppercase",
                    color: "var(--brand-ink)", marginBottom: 7 }}>{T.whosAroundShared}</div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                    {it.around.map((p) => (
                      <button key={p.id} onClick={() => onSelect(p.id)}
                        style={{ font: "inherit", cursor: "pointer", display: "flex", alignItems: "center", gap: 8,
                          background: `color-mix(in oklch, ${personVar(p.color)} 14%, var(--card))`,
                          border: `1px solid color-mix(in oklch, ${personVar(p.color)} 30%, transparent)`,
                          borderRadius: 99, padding: "6px 13px",
                          boxShadow: p.id === selectedId ? `0 0 0 2px ${personVar(p.color)}` : "none" }}>
                        <PersonDot i={p.color} />
                        <span style={{ fontSize: 12.5, fontWeight: 600 }}>{p.who}</span>
                        <span className="mono" style={{ fontSize: 11, color: "var(--ink-soft)" }}>{fmtRange(p)}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <AgendaRow key={i} e={it.e} selected={it.e.id === selectedId} onSelect={onSelect} />
          )
        )}
      </div>
    </div>
  );
}

function TodayMarker({ todayKey }) {
  const td = parseD(todayKey);
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
      <span style={{ width: 9, height: 9, borderRadius: 99, background: "var(--brand)", flex: "0 0 auto",
        boxShadow: "0 0 0 3px color-mix(in oklch, var(--brand) 22%, transparent)" }} />
      <span style={{ fontSize: 13, fontWeight: 700, color: "var(--brand-ink)", letterSpacing: ".02em", whiteSpace: "nowrap" }}>
        {T.todayMark} · {td.getDate()} {MON_SHORT[td.getMonth()]}
      </span>
      <span style={{ flex: 1, height: 1, background: "color-mix(in oklch, var(--brand) 32%, transparent)" }} />
    </div>
  );
}

export function AgendaView({ entries, presence, selectedId, onSelect, onSelectBlackout }) {
  const [showPast, setShowPast] = useState(false);
  const todayKey = useToday();
  const items = useMemo(() => {
    const list = entries.map((e) => ({ kind: "rsv", date: e.start, e }));
    S.house.blackouts.forEach((b) => {
      const around = (presence || []).filter((p) => p.start <= b.end && p.end > b.start)
        .sort((x, y) => (x.start < y.start ? -1 : 1));
      list.push({ kind: "blk", date: b.start, b, around });
    });
    list.sort((a, b) => (a.date < b.date ? -1 : 1));
    return list;
  }, [entries, presence]);

  // "Past" = the stay/closure is fully over before today; it stays tucked away.
  const isPast = (it) => (it.kind === "blk" ? it.b.end < todayKey : it.e.end <= todayKey);
  const pastItems = items.filter(isPast);
  const upcoming = items.filter((it) => !isPast(it));
  const upcomingGroups = monthGroups(upcoming);
  const pastGroups = monthGroups(pastItems);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 22 }}>
      {pastItems.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 22 }}>
          <button onClick={() => setShowPast((s) => !s)}
            style={{ alignSelf: "flex-start", display: "inline-flex", alignItems: "center", gap: 8, font: "inherit",
              cursor: "pointer", background: "none", border: "none", padding: 0, fontSize: 12, fontWeight: 700,
              letterSpacing: ".05em", textTransform: "uppercase", color: "var(--ink-faint)" }}>
            <span style={{ display: "inline-block", transform: showPast ? "rotate(90deg)" : "none", transition: "transform .15s", fontSize: 10 }}>▶</span>
            {showPast ? T.hidePast : T.pastStays(pastItems.length)}
          </button>
          {showPast && (
            <div style={{ display: "flex", flexDirection: "column", gap: 22, opacity: 0.55 }}>
              {pastGroups.map((g) => (
                <AgendaMonth key={g.label} g={g} selectedId={selectedId} onSelect={onSelect} onSelectBlackout={onSelectBlackout} />
              ))}
            </div>
          )}
        </div>
      )}

      <TodayMarker todayKey={todayKey} />

      {upcomingGroups.length === 0 ? (
        <div style={{ fontSize: 13.5, color: "var(--ink-faint)", fontStyle: "italic" }}>{T.nothingUpcoming}</div>
      ) : (
        upcomingGroups.map((g) => (
          <AgendaMonth key={g.label} g={g} selectedId={selectedId} onSelect={onSelect} onSelectBlackout={onSelectBlackout} />
        ))
      )}
    </div>
  );
}

function AgendaRow({ e, selected, onSelect }) {
  const isReview = !!e.review;
  return (
    <button onClick={() => onSelect(e.id)}
      style={{ textAlign: "left", font: "inherit", cursor: "pointer", width: "100%",
        background: "var(--card)", border: "1px solid var(--line)", borderLeft: `4px solid ${personVar(e.color)}`,
        borderRadius: 11, padding: "13px 16px", display: "grid", gridTemplateColumns: "auto minmax(0,1fr) auto", gap: 16, alignItems: "center", maxWidth: "100%",
        boxShadow: selected ? `0 0 0 2px ${isReview ? "var(--alert)" : personVar(e.color)}` : "var(--shadow-sm)",
        transition: "box-shadow .12s" }}>
      <div className="mono" style={{ fontSize: 12.5, color: "var(--ink-soft)", fontWeight: 700, whiteSpace: "nowrap" }}>{fmtRange(e)}</div>
      <div style={{ minWidth: 0 }}>
        <div style={{ fontWeight: 600, display: "flex", alignItems: "center", gap: 8, minWidth: 0, overflowWrap: "anywhere" }}>{e.who}
          {isReview && <span style={{ fontSize: 11, color: "var(--alert)", fontWeight: 700 }}>⚠ rever</span>}</div>
        <div style={{ fontSize: 12.5, color: "var(--ink-faint)" }}>{plural(nights(e), "noite", "noites")}{e.party ? ` · ${T.people(e.party)}` : ` · ${T.partyUnknown}`}</div>
      </div>
      <StatusBadge status={e.status} review={e.review} />
    </button>
  );
}
