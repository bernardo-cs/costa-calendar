/* ============================================================
   panel.jsx — detail panel, review inbox, JSON data view
   ============================================================ */
import React from "react";
import { S, msg } from "./store.js";
import { T } from "./i18n.js";
import {
  personVar, PersonDot, StatusBadge, LockGlyph,
  parseD, MON_SHORT, nights, fmtRange, fmtMsgTime,
} from "./calendar.jsx";

const { useState } = React;

/* ---------- syntax-ish JSON renderer ---------- */
export function JsonBlock({ obj, compact }) {
  const text = JSON.stringify(obj, null, 2);
  const lines = text.split("\n").map((ln, i) => {
    const parts = [];
    const re = /("(?:[^"\\]|\\.)*"\s*:)|("(?:[^"\\]|\\.)*")|(\b-?\d+\.?\d*\b)|(\btrue\b|\bfalse\b|\bnull\b)/g;
    let last = 0, m;
    while ((m = re.exec(ln))) {
      if (m.index > last) parts.push(<span key={parts.length}>{ln.slice(last, m.index)}</span>);
      let color = "var(--ink)";
      if (m[1]) color = "var(--brand-ink)";
      else if (m[2]) color = "var(--sage)";
      else if (m[3]) color = "var(--p3)";
      else if (m[4]) color = "var(--ochre)";
      parts.push(<span key={parts.length} style={{ color }}>{m[0]}</span>);
      last = m.index + m[0].length;
    }
    if (last < ln.length) parts.push(<span key={parts.length}>{ln.slice(last)}</span>);
    return <div key={i} style={{ whiteSpace: "pre" }}>{parts}</div>;
  });
  return (
    <div className="mono scroll" style={{ fontSize: 12, lineHeight: 1.65, color: "var(--ink-soft)",
      background: "var(--paper-2)", border: "1px solid var(--line)", borderRadius: 9,
      padding: compact ? "10px 12px" : "13px 15px", overflowX: "auto" }}>
      {lines}
    </div>
  );
}

/* ---------- a WhatsApp-style source message bubble ---------- */
export function MsgBubble({ m, highlight }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 3,
      background: highlight ? `color-mix(in oklch, ${personVar(m.color)} 12%, var(--card))` : "var(--card)",
      border: `1px solid ${highlight ? `color-mix(in oklch, ${personVar(m.color)} 35%, transparent)` : "var(--line)"}`,
      borderRadius: 11, borderTopLeftRadius: 3, padding: "9px 12px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
        <PersonDot i={m.color} />
        <span style={{ fontSize: 12.5, fontWeight: 700, color: personVar(m.color) }}>{m.sender}</span>
        <span className="mono" style={{ fontSize: 10.5, color: "var(--ink-faint)", marginLeft: "auto" }}>{fmtMsgTime(m.time)}</span>
      </div>
      <div style={{ fontSize: 13.5, color: "var(--ink)", lineHeight: 1.4 }}>{m.text}</div>
    </div>
  );
}

/* ---------- ENTRY DETAIL ---------- */
export function EntryDetail({ e, showConfidence }) {
  const [showJson, setShowJson] = useState(false);
  const sources = e.source.map((id) => msg(id)).filter(Boolean);
  const isReview = !!e.review;
  const isPresence = e.kind === "presence";

  const jsonView = {
    id: e.id, ...(isPresence ? { kind: "presence" } : {}), who: e.who, party: e.party, start: e.start, end: e.end,
    nights: nights(e), status: e.status, ...(e.review ? { review: e.review } : {}),
    confidence: e.confidence, notes: e.notes, source: e.source,
    ...(e.conflictsWith ? { conflictsWith: e.conflictsWith } : {}),
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
      <div>
        <div style={{ display: "flex", alignItems: "center", gap: 9, marginBottom: 6 }}>
          <PersonDot i={e.color} size={11} />
          <h2 className="serif" style={{ margin: 0, fontSize: 27, fontWeight: 500, letterSpacing: "-0.01em" }}>{e.who}</h2>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <StatusBadge status={e.status} review={e.review} />
          {showConfidence && (
            <span className="mono" style={{ fontSize: 11, color: "var(--ink-faint)" }}>
              {T.conf} {Math.round(e.confidence * 100)}%
            </span>
          )}
        </div>
      </div>

      {isPresence && (
        <div className="hatch" style={{ border: "1px dashed var(--brand)", borderRadius: 11, padding: "13px 15px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 7, fontWeight: 700, color: "var(--brand-ink)", fontSize: 13, marginBottom: 5 }}>
            <LockGlyph /> {T.stayingClosedPeriod}
          </div>
          <div style={{ fontSize: 13, color: "var(--ink-soft)", lineHeight: 1.45 }}>
            {T.presenceExplain(e.who.split(" ").slice(-1)[0])}
          </div>
        </div>
      )}

      {isReview && (
        <div style={{ background: "color-mix(in oklch, var(--alert) 9%, var(--card))",
          border: "1px solid color-mix(in oklch, var(--alert) 30%, transparent)", borderRadius: 11, padding: "13px 15px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 7, fontWeight: 700, color: "var(--alert)", fontSize: 13, marginBottom: 5 }}>
            ⚠ {T.needsReview} — {e.review === "conflict" ? T.reviewDouble : T.reviewAmbiguous}
          </div>
          <div style={{ fontSize: 13, color: "var(--ink-soft)", lineHeight: 1.45 }}>{e.reviewNote}</div>
          <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
            <ActionBtn primary>{T.confirmDates}</ActionBtn>
            <ActionBtn>{T.adjust}</ActionBtn>
            <ActionBtn>{T.dismiss}</ActionBtn>
          </div>
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 1, background: "var(--line)",
        border: "1px solid var(--line)", borderRadius: 11, overflow: "hidden" }}>
        <Field label={T.checkIn} value={`${parseD(e.start).getDate()} ${MON_SHORT[parseD(e.start).getMonth()]}`} />
        <Field label={T.checkOut} value={`${parseD(e.end).getDate()} ${MON_SHORT[parseD(e.end).getMonth()]}`} />
        <Field label={T.nights} value={String(nights(e))} />
        <Field label={T.party} value={e.party ? T.people(e.party) : T.unknownParty} dim={!e.party} />
      </div>
      {e.notes && (
        <div>
          <Lbl>{T.notes}</Lbl>
          <div style={{ fontSize: 13.5, color: "var(--ink-soft)", fontStyle: "italic", fontFamily: "var(--font-display)" }}>“{e.notes}”</div>
        </div>
      )}

      <div>
        <Lbl>{sources.length > 1 ? T.triggeredByN(sources.length) : T.triggeredByOne}</Lbl>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {sources.map((m) => <MsgBubble key={m.id} m={m} highlight />)}
        </div>
      </div>

      <div>
        <button onClick={() => setShowJson((s) => !s)} style={{ ...lnkBtn, marginBottom: showJson ? 10 : 0 }}>
          <Chevron open={showJson} /> {T.extractedJson}
        </button>
        {showJson && <JsonBlock obj={jsonView} />}
      </div>
    </div>
  );
}

function Field({ label, value, dim }) {
  return (
    <div style={{ background: "var(--card)", padding: "10px 13px" }}>
      <div style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: ".07em", textTransform: "uppercase", color: "var(--ink-faint)" }}>{label}</div>
      <div className="mono" style={{ fontSize: 14, fontWeight: 700, color: dim ? "var(--ink-faint)" : "var(--ink)", marginTop: 2 }}>{value}</div>
    </div>
  );
}
export function Lbl({ children }) {
  return <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: ".07em", textTransform: "uppercase", color: "var(--ink-faint)", marginBottom: 7 }}>{children}</div>;
}
const lnkBtn = { display: "inline-flex", alignItems: "center", gap: 7, background: "none", border: "none", cursor: "pointer",
  font: "inherit", fontSize: 12.5, fontWeight: 700, letterSpacing: ".05em", textTransform: "uppercase", color: "var(--brand-ink)", padding: 0 };
function Chevron({ open }) {
  return <span style={{ display: "inline-block", transform: open ? "rotate(90deg)" : "none", transition: "transform .15s", fontSize: 10 }}>▶</span>;
}
function ActionBtn({ children, primary }) {
  return (
    <button style={{ font: "inherit", fontSize: 12.5, fontWeight: 600, cursor: "pointer", padding: "7px 13px", borderRadius: 8,
      border: primary ? "none" : "1px solid var(--line-2)",
      background: primary ? "var(--brand)" : "var(--card)", color: primary ? "var(--paper)" : "var(--ink-soft)" }}>
      {children}
    </button>
  );
}

/* ---------- BLACKOUT DETAIL ---------- */
export function BlackoutDetail({ b, presence, onSelect }) {
  const ruleMsg = b.source && b.source.length ? msg(b.source[0]) : null;
  const around = (presence || []).filter((p) => p.start <= b.end && p.end > b.start)
    .sort((x, y) => (x.start < y.start ? -1 : 1));
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
      <div>
        <div style={{ display: "flex", alignItems: "center", gap: 9, marginBottom: 6, color: "var(--brand-ink)" }}>
          <LockGlyph />
          <h2 className="serif" style={{ margin: 0, fontSize: 26, fontWeight: 500 }}>{T.houseClosed}</h2>
        </div>
        <div style={{ fontSize: 13.5, color: "var(--ink-soft)" }}>{b.label} — {b.detail}</div>
      </div>
      <div className="hatch" style={{ border: "1px dashed var(--brand)", borderRadius: 11, padding: "15px 16px" }}>
        <div className="mono" style={{ fontSize: 13, fontWeight: 700, color: "var(--brand-ink)" }}>
          {parseD(b.start).getDate()} {MON_SHORT[parseD(b.start).getMonth()]} → {parseD(b.end).getDate()} {MON_SHORT[parseD(b.end).getMonth()]}
        </div>
        <div style={{ fontSize: 13, color: "var(--ink-soft)", marginTop: 6 }}>
          {T.noReservationsPeriod}
        </div>
      </div>

      <div>
        <Lbl>{T.whosAround} {around.length ? `· ${around.length}` : ""}</Lbl>
        {around.length === 0 ? (
          <div style={{ fontSize: 13, color: "var(--ink-faint)", fontStyle: "italic" }}>{T.noOneShared}</div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {around.map((p) => (
              <button key={p.id} onClick={() => onSelect(p.id)}
                style={{ textAlign: "left", font: "inherit", cursor: "pointer", width: "100%",
                  background: `color-mix(in oklch, ${personVar(p.color)} 12%, var(--card))`,
                  border: `1px solid color-mix(in oklch, ${personVar(p.color)} 30%, transparent)`,
                  borderRadius: 99, padding: "8px 14px", display: "flex", alignItems: "center", gap: 10 }}>
                <PersonDot i={p.color} />
                <span style={{ fontWeight: 600, fontSize: 13 }}>{p.who}</span>
                <span className="mono" style={{ fontSize: 11.5, color: "var(--ink-soft)", marginLeft: "auto" }}>{fmtRange(p)}</span>
              </button>
            ))}
          </div>
        )}
        <div style={{ fontSize: 12, color: "var(--ink-faint)", marginTop: 8, lineHeight: 1.45 }}>
          {T.sharingOptional}
        </div>
      </div>

      {ruleMsg && (
        <div>
          <Lbl>{T.setByMessage}</Lbl>
          <MsgBubble m={ruleMsg} highlight />
        </div>
      )}
    </div>
  );
}

/* ---------- REVIEW INBOX ---------- */
export function ReviewInbox({ entries, onSelect }) {
  const items = entries.filter((e) => e.review);
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div>
        <h2 className="serif" style={{ margin: "0 0 4px", fontSize: 24, fontWeight: 500 }}>{T.needsReview}</h2>
        <div style={{ fontSize: 13, color: "var(--ink-soft)" }}>{T.flaggedCount(items.length)}</div>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {items.map((e) => (
          <button key={e.id} onClick={() => onSelect(e.id)}
            style={{ textAlign: "left", font: "inherit", cursor: "pointer", borderRadius: 11, padding: "13px 15px",
              background: "color-mix(in oklch, var(--alert) 7%, var(--card))",
              border: "1px solid color-mix(in oklch, var(--alert) 26%, transparent)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
              <span style={{ fontSize: 11.5, fontWeight: 700, color: "var(--alert)", textTransform: "uppercase", letterSpacing: ".05em" }}>
                {e.review === "conflict" ? `⚠ ${T.conflict}` : "⚠ Ambíguo"}
              </span>
              <span className="mono" style={{ fontSize: 11, color: "var(--ink-faint)", marginLeft: "auto" }}>{fmtRange(e)}</span>
            </div>
            <div style={{ fontWeight: 600, marginBottom: 3 }}>{e.who}</div>
            <div style={{ fontSize: 12.5, color: "var(--ink-soft)", lineHeight: 1.4 }}>{e.reviewNote}</div>
          </button>
        ))}
      </div>
    </div>
  );
}

/* ---------- DEFAULT / SUMMARY ---------- */
export function PanelSummary({ entries, onShowReview }) {
  const reviewN = entries.filter((e) => e.review).length;
  const confirmed = entries.filter((e) => e.status === "confirmed").length;
  const totalNights = entries.reduce((s, e) => s + nights(e), 0);
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <div>
        <h2 className="serif" style={{ margin: "0 0 4px", fontSize: 24, fontWeight: 500 }}>{T.thisYear}</h2>
        <div style={{ fontSize: 13, color: "var(--ink-soft)" }}>{T.pulledLive}</div>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
        <Stat n={confirmed} label={T.confirmedStays} />
        <Stat n={totalNights} label={T.nightsBooked} />
      </div>
      {reviewN > 0 && (
        <button onClick={onShowReview} style={{ textAlign: "left", font: "inherit", cursor: "pointer", borderRadius: 11, padding: "14px 16px",
          background: "color-mix(in oklch, var(--alert) 8%, var(--card))", border: "1px solid color-mix(in oklch, var(--alert) 28%, transparent)",
          display: "flex", alignItems: "center", gap: 12 }}>
          <span style={{ fontSize: 22 }}>⚠</span>
          <div>
            <div style={{ fontWeight: 700, color: "var(--alert)" }}>{T.requestsNeedReview(reviewN)}</div>
            <div style={{ fontSize: 12.5, color: "var(--ink-soft)" }}>{T.tentativeOrConflicting}</div>
          </div>
          <span style={{ marginLeft: "auto", color: "var(--alert)" }}>→</span>
        </button>
      )}
      <div>
        <Lbl>{T.legend}</Lbl>
        <div style={{ display: "flex", flexDirection: "column", gap: 9, fontSize: 13, color: "var(--ink-soft)" }}>
          <LegendRow swatch={<span style={{ width: 22, height: 13, borderRadius: 5, background: "color-mix(in oklch, var(--p3) 16%, var(--card))", border: "1px solid color-mix(in oklch, var(--p3) 38%, transparent)" }} />}>{T.legendConfirmed}</LegendRow>
          <LegendRow swatch={<span style={{ width: 22, height: 13, borderRadius: 5, background: "var(--card)", border: "1.5px dashed var(--ochre)" }} />}>{T.legendTentative}</LegendRow>
          <LegendRow swatch={<span style={{ width: 22, height: 13, borderRadius: 5, background: "var(--card)", border: "1.5px dashed var(--alert)" }} />}>{T.legendConflict}</LegendRow>
          <LegendRow swatch={<span className="hatch" style={{ width: 22, height: 13, borderRadius: 5, border: "1px dashed var(--brand)" }} />}>{T.legendClosed}</LegendRow>
          <LegendRow swatch={<span style={{ width: 22, height: 13, borderRadius: 99, background: "color-mix(in oklch, var(--p0) 20%, var(--paper))", border: "1px solid color-mix(in oklch, var(--p0) 32%, transparent)" }} />}>{T.legendShared}</LegendRow>
        </div>
      </div>
    </div>
  );
}
function Stat({ n, label }) {
  return (
    <div style={{ background: "var(--card)", border: "1px solid var(--line)", borderRadius: 11, padding: "14px 16px" }}>
      <div className="serif" style={{ fontSize: 32, fontWeight: 500, lineHeight: 1, color: "var(--ink)" }}>{n}</div>
      <div style={{ fontSize: 12, color: "var(--ink-faint)", marginTop: 4 }}>{label}</div>
    </div>
  );
}
function LegendRow({ swatch, children }) {
  return <div style={{ display: "flex", alignItems: "center", gap: 11 }}>{swatch}<span>{children}</span></div>;
}

/* ============================================================
   DATA VIEW — the JSON source-of-truth, side by side with thread
   ============================================================ */
export function DataView({ entries, selectedId, onSelect, showConfidence, stack }) {
  const [showThread, setShowThread] = useState(false);
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
      <div style={{ display: "flex", alignItems: "flex-start", gap: 16, flexWrap: "wrap" }}>
        <div style={{ flex: "1 1 280px" }}>
          <h2 className="serif" style={{ margin: "0 0 5px", fontSize: 23, fontWeight: 500 }}>{T.dataLayerTitle}</h2>
          <div style={{ fontSize: 13, color: "var(--ink-soft)", lineHeight: 1.5, maxWidth: 560 }}>
            {T.dataLayerBlurb}
          </div>
        </div>
        <button onClick={() => setShowThread((s) => !s)} style={{ ...lnkBtn, textTransform: "none", fontSize: 13, padding: "8px 12px",
          border: "1px solid var(--line-2)", borderRadius: 8, background: showThread ? "var(--paper-2)" : "var(--card)" }}>
          {showThread ? T.hideThread : T.showThread}
        </button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: (showThread && !stack) ? "1fr 1fr" : "1fr", gap: 16, alignItems: "start" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <div className="mono" style={{ fontSize: 11, color: "var(--ink-faint)", fontWeight: 700 }}>{T.entriesLabel(entries.length)}</div>
          {entries.map((e) => {
            const sel = e.id === selectedId;
            const obj = { id: e.id, who: e.who, party: e.party, start: e.start, end: e.end,
              status: e.status, ...(e.review ? { review: e.review } : {}), ...(showConfidence ? { confidence: e.confidence } : {}),
              notes: e.notes, source: e.source };
            return (
              <div key={e.id} onClick={() => onSelect(e.id)} style={{ cursor: "pointer", borderRadius: 10,
                outline: sel ? `2px solid ${e.review ? "var(--alert)" : personVar(e.color)}` : "none", outlineOffset: 2 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 5 }}>
                  <PersonDot i={e.color} />
                  <span style={{ fontSize: 12.5, fontWeight: 600 }}>{e.who}</span>
                  {e.review && <span style={{ fontSize: 11, color: "var(--alert)", fontWeight: 700 }}>⚠</span>}
                  <span className="mono" style={{ fontSize: 10.5, color: "var(--ink-faint)", marginLeft: "auto" }}>→ {e.source.join(", ")}</span>
                </div>
                <JsonBlock obj={obj} compact />
              </div>
            );
          })}
        </div>

        {showThread && (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <div className="mono" style={{ fontSize: 11, color: "var(--ink-faint)", fontWeight: 700 }}>{T.threadLabel(S.thread.length)}</div>
            {S.thread.map((m) => {
              const kept = m.type === "booking" || m.type === "rule" || m.type === "review" || m.type === "presence";
              return (
                <div key={m.id} style={{ opacity: kept ? 1 : 0.42, transition: "opacity .15s" }}>
                  <MsgBubble m={m} highlight={false} />
                  {kept && (
                    <div className="mono" style={{ fontSize: 10, color: m.type === "review" ? "var(--alert)" : "var(--sage)",
                      fontWeight: 700, padding: "3px 0 0 6px" }}>
                      {m.type === "rule" ? T.setBlackoutRule : m.type === "review" ? T.flaggedForReview : T.extractedReservation}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
