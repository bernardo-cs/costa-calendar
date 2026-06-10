/* ============================================================
   mobile.jsx — phone layout: compact shell + bottom sheet
   Reuses AgendaView (calendar), DataView/EntryDetail/BlackoutDetail/
   ReviewInbox/Lbl (panel).
   ============================================================ */
import React from "react";
import { S } from "./store.js";
import { T, MONTHS, WD1_MON, WD1_SUN, WD_FULL } from "./i18n.js";
import {
  addDays, fmtKey, parseD, blackoutFor, personVar, PersonDot,
  StatusBadge, LockGlyph, fmtRange, MON_SHORT, AgendaView, useToday,
} from "./calendar.jsx";
import { DataView, EntryDetail, BlackoutDetail, ReviewInbox, Lbl } from "./panel.jsx";

const { useState, useEffect, useMemo } = React;

export function useIsMobile(bp = 720) {
  const [m, setM] = useState(typeof window !== "undefined" && window.innerWidth < bp);
  useEffect(() => {
    const f = () => setM(window.innerWidth < bp);
    window.addEventListener("resize", f);
    return () => window.removeEventListener("resize", f);
  }, [bp]);
  return m;
}

/* ---------- bottom sheet ---------- */
export function BottomSheet({ open, onClose, children }) {
  const [render, setRender] = useState(open);
  const [shown, setShown] = useState(false);
  useEffect(() => {
    if (open) { setRender(true); const r = setTimeout(() => setShown(true), 20); return () => clearTimeout(r); }
    else { setShown(false); const t = setTimeout(() => setRender(false), 280); return () => clearTimeout(t); }
  }, [open]);
  if (!render) return null;
  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, zIndex: 50, display: "flex", alignItems: "flex-end",
      background: `oklch(0.2 0.02 60 / ${shown ? 0.4 : 0})`, transition: "background .28s" }}>
      <div onClick={(e) => e.stopPropagation()} className="scroll"
        style={{ width: "100%", maxHeight: "90%", background: "var(--paper)",
          borderTopLeftRadius: 24, borderTopRightRadius: 24, overflowY: "auto",
          transform: shown ? "translateY(0)" : "translateY(101%)",
          transition: "transform .3s cubic-bezier(.32,.72,0,1)",
          boxShadow: "0 -10px 50px oklch(0.2 0.02 60 / .22)", padding: "8px 20px 44px" }}>
        <div onClick={onClose} style={{ display: "flex", justifyContent: "center", padding: "6px 0 16px", cursor: "pointer" }}>
          <div style={{ width: 40, height: 5, borderRadius: 99, background: "var(--line-2)" }} />
        </div>
        {children}
      </div>
    </div>
  );
}

/* ---------- mobile header ---------- */
function pad2m(n) { return String(n).padStart(2, "0"); }
function MobileHeader({ pipeline, lastSync, onReview }) {
  return (
    <header style={{ padding: "13px 16px 12px", background: "var(--card)", borderBottom: "1px solid var(--line)" }}>
      <div style={{ display: "flex", alignItems: "baseline", gap: 9 }}>
        <h1 className="serif" style={{ margin: 0, fontSize: 22, fontWeight: 500, letterSpacing: "-0.015em" }}>{S.house.name}</h1>
        <span style={{ fontSize: 12.5, color: "var(--ink-faint)" }}>· {S.house.location}</span>
        <span style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{ width: 7, height: 7, borderRadius: 99, background: "var(--sage)", boxShadow: "0 0 0 3px color-mix(in oklch, var(--sage) 25%, transparent)" }} />
          <span className="mono" style={{ fontSize: 10.5, color: "var(--ink-soft)" }}>{T.synced} {pad2m(lastSync.getHours())}:{pad2m(lastSync.getMinutes())}</span>
        </span>
      </div>
      <button onClick={pipeline.needsReview > 0 ? onReview : undefined}
        style={{ width: "100%", marginTop: 11, font: "inherit", cursor: pipeline.needsReview > 0 ? "pointer" : "default",
          display: "flex", alignItems: "center", gap: 8, padding: "9px 12px", borderRadius: 11,
          background: "var(--paper-2)", border: "1px solid var(--line)", textAlign: "left" }}>
        <span style={{ fontSize: 15, flexShrink: 0 }}>🤖</span>
        <span style={{ fontSize: 12.5, color: "var(--ink-soft)", minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          <strong style={{ color: "var(--ink)" }}>{T.staysFrom(pipeline.extracted, pipeline.scanned)}</strong>
        </span>
        {pipeline.needsReview > 0 && (
          <span style={{ marginLeft: "auto", flexShrink: 0, display: "flex", alignItems: "center", gap: 6, fontSize: 12, fontWeight: 700,
            color: "var(--alert)", padding: "4px 10px", borderRadius: 99,
            background: "color-mix(in oklch, var(--alert) 11%, var(--card))",
            border: "1px solid color-mix(in oklch, var(--alert) 30%, transparent)" }}>
            {T.reviewArrow(pipeline.needsReview)}
          </span>
        )}
      </button>
    </header>
  );
}

/* ---------- mobile tabs + month nav ---------- */
function MobileTabs({ view, setView }) {
  return (
    <div style={{ display: "flex", gap: 3, padding: "10px 16px 0", background: "var(--paper)" }}>
      {[["agenda", T.agenda], ["month", T.month], ["data", T.data]].map(([k, lbl]) => (
        <button key={k} onClick={() => setView(k)} style={{
          flex: 1, font: "inherit", fontSize: 13.5, fontWeight: 600, cursor: "pointer", padding: "9px 0", borderRadius: 9,
          background: view === k ? "var(--card)" : "var(--paper-2)", color: view === k ? "var(--ink)" : "var(--ink-faint)",
          boxShadow: view === k ? "var(--shadow-sm)" : "none", border: `1px solid ${view === k ? "var(--line)" : "transparent"}` }}>{lbl}</button>
      ))}
    </div>
  );
}
function MonthNavM({ cursor, setCursor }) {
  const step = (d) => setCursor((c) => { let m = c.m + d, y = c.y; if (m < 0) { m = 11; y--; } if (m > 11) { m = 0; y++; } return { y, m }; });
  const A = (dir, fn) => (
    <button onClick={fn} style={{ width: 38, height: 38, borderRadius: 10, border: "1px solid var(--line)",
      background: "var(--card)", cursor: "pointer", fontSize: 19, color: "var(--ink-soft)", display: "flex", alignItems: "center", justifyContent: "center" }}>{dir}</button>
  );
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "14px 16px 4px" }}>
      {A("‹", () => step(-1))}
      <div className="serif" style={{ flex: 1, textAlign: "center", fontSize: 21, fontWeight: 500 }}>{MONTHS[cursor.m]} {cursor.y}</div>
      {A("›", () => step(1))}
    </div>
  );
}

/* ---------- mobile month grid (dots) ---------- */
function MonthGridM({ year, month, weekStartMon, entries, presence, onOpenDay, onSelectBlackout, onSelect }) {
  const WD = weekStartMon ? WD1_MON : WD1_SUN;
  const todayKey = useToday();
  const weeks = useMemo(() => {
    const first = new Date(year, month, 1);
    const off = weekStartMon ? ((first.getDay() + 6) % 7) : first.getDay();
    const gridStart = addDays(first, -off);
    const out = [];
    for (let w = 0; w < 6; w++) {
      const row = [];
      for (let d = 0; d < 7; d++) { const dt = addDays(gridStart, w * 7 + d); row.push({ dt, key: fmtKey(dt), inMonth: dt.getMonth() === month }); }
      out.push(row);
    }
    while (out.length > 4 && out[out.length - 1].every((c) => !c.inMonth)) out.pop();
    return out;
  }, [year, month, weekStartMon]);

  const itemsFor = (key) => ({
    r: entries.filter((e) => e.start <= key && key < e.end),
    p: presence.filter((e) => e.start <= key && key < e.end),
    blk: blackoutFor(key),
  });
  const onTap = (key) => {
    const { r, p, blk } = itemsFor(key);
    const total = r.length + p.length;
    if (total === 0) { if (blk) onSelectBlackout(blk); return; }
    if (total === 1 && !blk) { onSelect((r[0] || p[0]).id); return; }
    onOpenDay(key);
  };

  return (
    <div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", marginBottom: 4 }}>
        {WD.map((d, i) => (
          <div key={i} style={{ textAlign: "center", fontSize: 11, fontWeight: 700, color: "var(--ink-faint)", padding: "2px 0" }}>{d}</div>
        ))}
      </div>
      <div style={{ background: "var(--card)", border: "1px solid var(--line)", borderRadius: 14, overflow: "hidden" }}>
        {weeks.map((week, wi) => (
          <div key={wi} style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", borderBottom: wi < weeks.length - 1 ? "1px solid var(--line)" : "none" }}>
            {week.map((c, ci) => {
              const { r, p, blk } = itemsFor(c.key);
              const dots = [...r.map((e) => ({ c: e.color, fill: true })), ...p.map((e) => ({ c: e.color, fill: false }))];
              const today = c.key === todayKey;
              return (
                <button key={ci} onClick={() => onTap(c.key)} className={blk ? "hatch" : ""}
                  style={{ font: "inherit", cursor: (dots.length || blk) ? "pointer" : "default", border: "none",
                    borderRight: ci < 6 ? "1px solid var(--line)" : "none",
                    background: blk ? undefined : (today ? "color-mix(in oklch, var(--brand) 8%, transparent)" : (c.inMonth ? "transparent" : "var(--paper-2)")),
                    minHeight: 52, padding: "6px 0 4px", display: "flex", flexDirection: "column", alignItems: "center", gap: 5,
                    opacity: c.inMonth ? 1 : 0.5 }}>
                  {today ? (
                    <span className="mono" style={{ display: "inline-flex", alignItems: "center", justifyContent: "center",
                      minWidth: 19, height: 19, borderRadius: 99, background: "var(--brand)", color: "#fff", fontSize: 11.5, fontWeight: 700 }}>{c.dt.getDate()}</span>
                  ) : (
                    <span className="mono" style={{ fontSize: 12, fontWeight: 700, color: blk ? "var(--brand-ink)" : (c.inMonth ? "var(--ink-soft)" : "var(--ink-faint)") }}>{c.dt.getDate()}</span>
                  )}
                  <span style={{ display: "flex", gap: 3, flexWrap: "wrap", justifyContent: "center", maxWidth: 42 }}>
                    {dots.slice(0, 4).map((d, i) => (
                      <span key={i} style={{ width: 6, height: 6, borderRadius: 99,
                        background: d.fill ? personVar(d.c) : "transparent",
                        border: d.fill ? "none" : `1.5px solid ${personVar(d.c)}` }} />
                    ))}
                    {dots.length > 4 && <span style={{ fontSize: 8.5, fontWeight: 700, color: "var(--ink-faint)", lineHeight: "6px" }}>+{dots.length - 4}</span>}
                  </span>
                </button>
              );
            })}
          </div>
        ))}
      </div>
      <MobileLegend />
    </div>
  );
}

function MobileLegend() {
  const Item = ({ sw, children }) => (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 11.5, color: "var(--ink-soft)", whiteSpace: "nowrap" }}>{sw}{children}</span>
  );
  return (
    <div className="scroll" style={{ display: "flex", gap: 16, overflowX: "auto", padding: "14px 2px 2px" }}>
      <Item sw={<span style={{ width: 8, height: 8, borderRadius: 99, background: "var(--p3)" }} />}>{T.booked}</Item>
      <Item sw={<span style={{ width: 8, height: 8, borderRadius: 99, border: "1.5px solid var(--p0)" }} />}>{T.stayingShared}</Item>
      <Item sw={<span className="hatch" style={{ width: 14, height: 10, borderRadius: 3, border: "1px dashed var(--brand)" }} />}>{T.closed}</Item>
    </div>
  );
}

/* ---------- day detail (sheet) ---------- */
function DayDetail({ dayKey, entries, presence, onSelect }) {
  const d = parseD(dayKey);
  const r = entries.filter((e) => e.start <= dayKey && dayKey < e.end);
  const p = presence.filter((e) => e.start <= dayKey && dayKey < e.end);
  const blk = blackoutFor(dayKey);

  const Row = ({ e, presenceRow }) => (
    <button onClick={() => onSelect(e.id)} style={{ textAlign: "left", font: "inherit", cursor: "pointer", width: "100%",
      background: presenceRow ? `color-mix(in oklch, ${personVar(e.color)} 12%, var(--card))` : "var(--card)",
      border: `1px solid ${presenceRow ? `color-mix(in oklch, ${personVar(e.color)} 30%, transparent)` : "var(--line)"}`,
      borderLeft: `4px solid ${personVar(e.color)}`, borderRadius: presenceRow ? 12 : 11, padding: "12px 14px",
      display: "flex", alignItems: "center", gap: 11, marginBottom: 8 }}>
      <PersonDot i={e.color} size={10} />
      <div style={{ minWidth: 0 }}>
        <div style={{ fontWeight: 600, display: "flex", alignItems: "center", gap: 7 }}>{e.who}{e.review && <span style={{ fontSize: 11, color: "var(--alert)" }}>⚠</span>}</div>
        <div style={{ fontSize: 12.5, color: "var(--ink-faint)" }}>{fmtRange(e)} · {e.party ? `${e.party}p` : T.partyUnknown}</div>
      </div>
      <span style={{ marginLeft: "auto" }}><StatusBadge status={e.status} review={e.review} /></span>
    </button>
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div>
        <h2 className="serif" style={{ margin: "0 0 3px", fontSize: 25, fontWeight: 500 }}>{WD_FULL[d.getDay()]} {d.getDate()} {MON_SHORT[d.getMonth()]}</h2>
        <div style={{ fontSize: 13, color: blk ? "var(--brand-ink)" : "var(--ink-soft)", fontWeight: blk ? 700 : 400 }}>
          {blk ? T.houseClosedReservations : r.length ? T.staysBooked(r.length) : T.available}
        </div>
      </div>
      {blk && (
        <div className="hatch" style={{ border: "1px dashed var(--brand)", borderRadius: 11, padding: "12px 14px", display: "flex", alignItems: "center", gap: 9, color: "var(--brand-ink)" }}>
          <LockGlyph /><span style={{ fontSize: 13, fontWeight: 700 }}>{blk.label} — {blk.detail}</span>
        </div>
      )}
      {r.length > 0 && <div>{!blk && <Lbl>{T.booked}</Lbl>}{r.map((e) => <Row key={e.id} e={e} />)}</div>}
      {p.length > 0 && <div><Lbl>{blk ? T.whosAroundShared : T.staying}</Lbl>{p.map((e) => <Row key={e.id} e={e} presenceRow />)}</div>}
    </div>
  );
}

/* ---------- mobile shell ---------- */
export function MobileShell(props) {
  const { view, setView, cursor, setCursor, sel, setSel, entries, presence, pipeline, lastSync,
    selectEntry, selectBlackout, showReview, t } = props;
  const selectedEntry = sel?.type === "entry" ? [...entries, ...presence].find((e) => e.id === sel.id) : null;
  const selectDay = (key) => setSel({ type: "day", key });

  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column", minHeight: 0, background: "var(--paper)", position: "relative", overflow: "hidden" }}>
      <MobileHeader pipeline={pipeline} lastSync={lastSync} onReview={showReview} />
      <MobileTabs view={view} setView={setView} />
      {view === "month" && <MonthNavM cursor={cursor} setCursor={setCursor} />}
      <div className="scroll" style={{ flex: 1, minHeight: 0, minWidth: 0, maxWidth: "100%", padding: "16px 16px 90px" }}>
        {view === "month" && (
          <MonthGridM year={cursor.y} month={cursor.m} weekStartMon={t.weekStartMon}
            entries={entries} presence={presence}
            onOpenDay={selectDay} onSelectBlackout={selectBlackout} onSelect={selectEntry} />
        )}
        {view === "agenda" && (
          <AgendaView entries={entries} presence={presence} selectedId={null} onSelect={selectEntry} onSelectBlackout={selectBlackout} />
        )}
        {view === "data" && (
          <DataView entries={entries} selectedId={null} onSelect={selectEntry} showConfidence={t.showConfidence} stack />
        )}
      </div>

      <BottomSheet open={!!sel} onClose={() => setSel(null)}>
        {sel?.type === "entry" && selectedEntry && <EntryDetail e={selectedEntry} showConfidence={t.showConfidence} />}
        {sel?.type === "blackout" && <BlackoutDetail b={sel.b} presence={presence} onSelect={selectEntry} />}
        {sel?.type === "review" && <ReviewInbox entries={entries} onSelect={selectEntry} />}
        {sel?.type === "day" && <DayDetail dayKey={sel.key} entries={entries} presence={presence} onSelect={selectEntry} />}
      </BottomSheet>
    </div>
  );
}
