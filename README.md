# Calendário da Casa da Costa

Static GitHub Pages calendar for the family beach house, built around one idea:

**WhatsApp messages → `data/casa.json` → UI.**

An agent reads the family WhatsApp threads, extracts the reservations into a clean JSON file where every
entry links back to the exact message that produced it, and the site renders **only** that JSON. So what
you see on the calendar is exactly what was extracted, and each stay is traceable to its source message.

- Site: https://bernardo-cs.github.io/costa-calendar/
- Repo: https://github.com/bernardo-cs/costa-calendar

## How it works

- **`data/casa.json`** — the single source of truth: `house` (with the summer blackout), `pipeline` stats,
  `people` (name → colour), `thread` (the relevant WhatsApp messages, with real `message_id`s), `entries`
  (reservations), and `presence` (summer "I'll be around" shares — not bookings). Every `entry.source` is
  a real message id found in `thread`.
- **`src/`** — a small React app (no runtime CDN). Three views — **Mês** (month grid with spanning bars),
  **Agenda** (vertical timeline), **Camada de dados** (the JSON beside the raw thread). Responsive:
  two-column on desktop, agenda-first with bottom sheets under 720px (it's used ~99% on phones).
- **`dist/app.js`** — the built bundle (React included), committed and served as a static file.

### Privacy: the data ships encrypted

`data/casa.json` is the **plaintext** source of truth and stays **local only** (gitignored). The build
encrypts it with a password (`scripts/encrypt.mjs`: PBKDF2-SHA256 @ 600k iters → AES-256-GCM) into
**`data/casa.enc.json`**, which is the only data file committed. In the browser, a password gate
(`src/gate.jsx`) decrypts it client-side via Web Crypto before the app renders — so the calendar stays a
plain static GitHub Pages app, but the plaintext never travels over the wire.

> Because the ciphertext and the decryption code are both public, **password strength is the only defense** —
> use a long passphrase (4–5 unrelated words or 13+ random chars). Set it via `$COSTA_PASSWORD` before
> building, or you'll be prompted. Web Crypto requires a secure context (HTTPS or `localhost`).

## Develop

```bash
npm install                          # once
COSTA_PASSWORD=… npm run build       # encrypt data/casa.json + esbuild → dist/app.js
npm run serve                        # http://localhost:8000
```

Edit `src/*` for UI, `data/casa.json` for data, then rebuild. The UI fetches `data/casa.json` at runtime,
so a data-only change doesn't need a rebuild — but `deploy.sh` always rebuilds to be safe.

## Update the data + deploy

The repeatable workflow lives in a committed skill: **`.claude/skills/update-costa-calendar/SKILL.md`**.
Point an agent at it ("update the Costa calendar") and it will: pull WhatsApp via `wacli`, regenerate
`data/casa.json` (real message ids in `source`, the people/colour map, the summer-blackout rule, and the
parsing lessons), then run:

```bash
./deploy.sh "Update Costa calendar"   # build + commit + push + verify Pages cache
```

The token is never printed. WhatsApp source groups: `Reservas Costa`
(`120363426115983082@g.us`) and `Maison Carvalho - Costa` (`120363040663225714@g.us`).

## Design

UI ported from the "Casa da Vó" design handoff: warm paper/clay palette (oklch), Newsreader/Hanken
Grotesk/Space Mono, hatched "Casa fechada" summer band, per-person colours, and an agent pipeline strip
(messages lidas → estadias extraídas → para rever). Interface is Portuguese; message text is kept verbatim.
