/* ============================================================
   app.jsx — shell, header pipeline, toolbar, responsive layout
   (Design-tool Tweaks panel dropped; its defaults are hardcoded.)
   ============================================================ */
import React from "react";
import { S } from "./store.js";
import { MONTHS, T } from "./i18n.js";
import { MonthGrid, AgendaView } from "./calendar.jsx";
import { DataView, EntryDetail, BlackoutDetail, ReviewInbox, PanelSummary } from "./panel.jsx";
import { useIsMobile, MobileShell } from "./mobile.jsx";

const { useState, useEffect, useRef } = React;

// Hardcoded look-and-feel (was the Tweaks panel defaults).
const LOOK = { density: "regular", weekStartMon: true, showConfidence: true };

function pad2(n){ return String(n).padStart(2,"0"); }

export function App() {
  const now = new Date();
  const [view, setView] = useState("month");
  const [cursor, setCursor] = useState({ y: now.getFullYear(), m: now.getMonth() });
  const [sel, setSel] = useState(null);
  const isMobile = useIsMobile();
  const t = LOOK;

  const entries = S.entries;
  const presence = S.presence;

  // mobile defaults to the agenda view
  const didInit = useRef(false);
  useEffect(() => {
    if (didInit.current) return;
    didInit.current = true;
    if (isMobile) setView("agenda");
  }, [isMobile]);

  const selectEntry = (id) => setSel({ type: "entry", id });
  const selectBlackout = (b) => setSel({ type: "blackout", b });
  const showReview = () => setSel({ type: "review" });

  const selectedEntry = sel?.type === "entry" ? [...entries, ...presence].find((e) => e.id === sel.id) : null;
  const selectedId = selectedEntry?.id || null;

  const P = S.pipeline;
  const lastSync = new Date(P.lastSync);

  if (isMobile) {
    return (
      <MobileShell view={view} setView={setView} cursor={cursor} setCursor={setCursor}
        sel={sel} setSel={setSel} entries={entries} presence={presence} pipeline={P} lastSync={lastSync}
        selectEntry={selectEntry} selectBlackout={selectBlackout} showReview={showReview} t={t} />
    );
  }

  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column", minHeight: 0 }}>
      <Header pipeline={P} lastSync={lastSync} />
      <Toolbar view={view} setView={setView} cursor={cursor} setCursor={setCursor}
        reviewN={P.needsReview} onReview={showReview} now={now} />

      <div style={{ flex: 1, minHeight: 0, display: "grid", gridTemplateColumns: "minmax(0,1fr) 384px", gap: 0 }}>
        <div className="scroll" style={{ padding: "22px 26px 60px", minWidth: 0 }}>
          {view === "month" && (
            <MonthGrid year={cursor.y} month={cursor.m} weekStartMon={t.weekStartMon}
              entries={entries} presence={presence} selectedId={selectedId} onSelect={selectEntry} onSelectBlackout={selectBlackout}
              density={t.density} />
          )}
          {view === "agenda" && (
            <AgendaView entries={entries} presence={presence} selectedId={selectedId} onSelect={selectEntry} onSelectBlackout={selectBlackout} />
          )}
          {view === "data" && (
            <DataView entries={entries} selectedId={selectedId} onSelect={selectEntry} showConfidence={t.showConfidence} />
          )}
        </div>

        <aside className="scroll" style={{ borderLeft: "1px solid var(--line)", background: "var(--paper-2)",
          padding: "24px 24px 60px", minWidth: 0 }}>
          {!sel && <PanelSummary entries={entries} onShowReview={showReview} />}
          {sel?.type === "entry" && selectedEntry && <EntryDetail e={selectedEntry} showConfidence={t.showConfidence} />}
          {sel?.type === "blackout" && <BlackoutDetail b={sel.b} presence={presence} onSelect={selectEntry} />}
          {sel?.type === "review" && <ReviewInbox entries={entries} onSelect={selectEntry} />}
          {sel && (
            <button onClick={() => setSel(null)} style={{ marginTop: 22, ...closeBtn }}>{T.backToOverview}</button>
          )}
        </aside>
      </div>
    </div>
  );
}

const closeBtn = { background: "none", border: "none", cursor: "pointer", font: "inherit", fontSize: 12.5,
  fontWeight: 600, color: "var(--ink-faint)", padding: 0 };

/* ---------- HEADER ---------- */
function Header({ pipeline, lastSync }) {
  return (
    <header style={{ display: "flex", alignItems: "center", gap: 20, padding: "16px 26px",
      borderBottom: "1px solid var(--line)", background: "var(--card)", flexWrap: "wrap" }}>
      <div style={{ display: "flex", alignItems: "baseline", gap: 12, minWidth: 0 }}>
        <h1 className="serif" style={{ margin: 0, fontSize: 25, fontWeight: 500, letterSpacing: "-0.015em", whiteSpace: "nowrap" }}>
          {S.house.name}
        </h1>
        <span style={{ fontSize: 13, color: "var(--ink-faint)", whiteSpace: "nowrap" }}>· {S.house.location}</span>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 10, marginLeft: "auto", flexWrap: "wrap" }}>
        <PipeStep icon="💬" n={pipeline.scanned} label={T.messagesScanned} />
        <Arrow />
        <PipeStep icon="🤖" n={pipeline.extracted} label={T.staysExtracted} />
        <Arrow />
        <PipeStep icon="⚠" n={pipeline.needsReview} label={T.needReview} alert={pipeline.needsReview > 0} />
        <div style={{ width: 1, height: 26, background: "var(--line)", margin: "0 4px" }} />
        <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
          <span style={{ width: 7, height: 7, borderRadius: 99, background: "var(--sage)", boxShadow: "0 0 0 3px color-mix(in oklch, var(--sage) 25%, transparent)" }} />
          <span className="mono" style={{ fontSize: 11, color: "var(--ink-soft)" }}>
            {T.synced} {pad2(lastSync.getDate())}/{pad2(lastSync.getMonth()+1)} {pad2(lastSync.getHours())}:{pad2(lastSync.getMinutes())}
          </span>
        </div>
      </div>
    </header>
  );
}
function PipeStep({ icon, n, label, alert }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "4px 10px", borderRadius: 9,
      background: alert ? "color-mix(in oklch, var(--alert) 9%, transparent)" : "transparent" }}>
      <span style={{ fontSize: 14, filter: alert ? "none" : "grayscale(0.2)" }}>{icon}</span>
      <div style={{ lineHeight: 1.05 }}>
        <div className="mono" style={{ fontSize: 15, fontWeight: 700, color: alert ? "var(--alert)" : "var(--ink)" }}>{n}</div>
        <div style={{ fontSize: 10.5, color: "var(--ink-faint)", whiteSpace: "nowrap" }}>{label}</div>
      </div>
    </div>
  );
}
function Arrow() { return <span style={{ color: "var(--line-2)", fontSize: 13 }}>→</span>; }

/* ---------- TOOLBAR ---------- */
function Toolbar({ view, setView, cursor, setCursor, reviewN, onReview, now }) {
  const step = (d) => setCursor((c) => {
    let m = c.m + d, y = c.y;
    if (m < 0) { m = 11; y--; } if (m > 11) { m = 0; y++; }
    return { y, m };
  });
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 16, padding: "11px 26px",
      borderBottom: "1px solid var(--line)", background: "var(--paper)" }}>
      <div style={{ display: "flex", gap: 2, background: "var(--paper-2)", border: "1px solid var(--line)", borderRadius: 9, padding: 3 }}>
        {[["month", T.month], ["agenda", T.agenda], ["data", T.dataLayer]].map(([k, lbl]) => (
          <button key={k} onClick={() => setView(k)} style={{
            font: "inherit", fontSize: 13, fontWeight: 600, cursor: "pointer", padding: "6px 14px", borderRadius: 7, border: "none",
            background: view === k ? "var(--card)" : "transparent", color: view === k ? "var(--ink)" : "var(--ink-faint)",
            boxShadow: view === k ? "var(--shadow-sm)" : "none" }}>{lbl}</button>
        ))}
      </div>

      {view === "month" && (
        <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
          <NavArrow dir="‹" onClick={() => step(-1)} />
          <div className="serif" style={{ fontSize: 20, fontWeight: 500, minWidth: 158, textAlign: "center" }}>
            {MONTHS[cursor.m]} {cursor.y}
          </div>
          <NavArrow dir="›" onClick={() => step(1)} />
          <button onClick={() => setCursor({ y: now.getFullYear(), m: now.getMonth() })} style={{ ...closeBtn, marginLeft: 8, fontSize: 12, color: "var(--brand-ink)", fontWeight: 700 }}>{T.today}</button>
        </div>
      )}

      <div style={{ marginLeft: "auto" }}>
        {reviewN > 0 && (
          <button onClick={onReview} style={{ font: "inherit", fontSize: 12.5, fontWeight: 700, cursor: "pointer",
            display: "flex", alignItems: "center", gap: 7, padding: "7px 13px", borderRadius: 99,
            background: "color-mix(in oklch, var(--alert) 11%, var(--card))", color: "var(--alert)",
            border: "1px solid color-mix(in oklch, var(--alert) 30%, transparent)" }}>
            ⚠ {T.requestsNeedReview(reviewN)}
          </button>
        )}
      </div>
    </div>
  );
}
function NavArrow({ dir, onClick }) {
  return (
    <button onClick={onClick} style={{ width: 32, height: 32, borderRadius: 8, border: "1px solid var(--line)",
      background: "var(--card)", cursor: "pointer", fontSize: 18, lineHeight: 1, color: "var(--ink-soft)",
      display: "flex", alignItems: "center", justifyContent: "center" }}>{dir}</button>
  );
}
