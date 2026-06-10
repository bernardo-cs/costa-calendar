---
name: update-costa-calendar
description: Regenerate the Casa da Costa calendar from WhatsApp and deploy. Use when asked to update/refresh the Costa calendar, re-parse the family reservation messages, or pull new bookings from the "Reservas Costa" / "Maison Carvalho - Costa" WhatsApp groups into the site.
---

# Update the Casa da Costa calendar

The site is a static GitHub Pages app that renders **only** `data/casa.json`. Your job each run:
pull the family's WhatsApp messages → extract the reservations into `data/casa.json` (with a real
`message_id` behind every entry) → build → deploy. The UI never parses anything; it just renders your JSON.

**Pipeline:** WhatsApp messages → `data/casa.json` → UI. Every calendar entry must point back to the
exact message(s) that produced it via `source: ["<message_id>"]`.

## 1. Pull the WhatsApp messages

Two groups feed the calendar:

- `Reservas Costa` — JID `120363426115983082@g.us` (reservation-focused)
- `Maison Carvalho - Costa` — JID `120363040663225714@g.us` (general; bookings mixed with chatter)

```bash
wacli messages list --chat 120363426115983082@g.us --limit 300 --json > /tmp/reservas-costa.json
wacli messages list --chat 120363040663225714@g.us --limit 400 --json > /tmp/maison-costa.json
```

Each message carries a stable `message_id` (hex string) — that is what goes in `source`. Skim recent
messages and the pinned/edited **"Central de reservas (DD/M/YYYY)"** list message, which is the family's
own canonical state — it's the highest-signal source. Search helpers:

```bash
for q in 'Central de reservas' 'reserva' 'verão' 'aparecer' 'férias' 'fim de semana' 'a confirmar'; do
  wacli messages search "$q" --chat 120363426115983082@g.us --limit 100 --json
done
```

## 2. Regenerate `data/casa.json`

Schema (see the current file for a worked example — keep its shape exactly):

```jsonc
{
  "house":   { "name", "location", "capacity", "blackouts": [ { "id","label","detail","start","end","kind":"blackout","note?","source":[id] } ] },
  "pipeline":{ "scanned", "extracted", "needsReview", "lastSync" },   // counts + ISO time of this run
  "people":  [ { "name", "aliases":[…], "color":0..8 } ],             // canonical name → color index
  "thread":  [ { "id":"<message_id>", "sender", "color":0..8, "time":"<ISO>", "text", "type":"booking|noise|rule|review|presence" } ],
  "entries": [ { "id","who","color","party|null","start","end","status":"confirmed|tentative",
                 "notes","source":[id…],"confidence",  "review?":"ambiguous|conflict","reviewNote?","conflictsWith?" } ],
  "presence":[ { "id","kind":"presence","who","color","party|null","start","end","status":"shared","notes","source":[id…],"confidence" } ]
}
```

### Rules of extraction

- **Dates are inclusive days present → `end` is checkout (last day + 1).** "12-14/6" → `start 2026-06-12,
  end 2026-06-15` (occupies 12, 13, 14). "3-4/6" → `start …-03, end …-05`. `nights = end − start`.
- **`source` holds real `message_id`s** from `thread`. Every entry/presence/blackout source id MUST also
  appear in `thread` (the app looks them up to render the provenance bubble). Include in `thread`: every
  message you cite as a source, plus a little surrounding `noise` for context in the Data layer view.
- **Reservation vs. presence.** A booking during the open season = `entries` (`confirmed`/`tentative`).
  During the **summer blackout** the house can't be reserved, but family may say "vou lá estar / vou
  aparecer" — that's `presence` (`status:"shared"`), NOT a reservation. Keep them separate.
- **The summer rule → a blackout.** Messages set it as roughly **21 jun – 21 set** ("No verão não há
  marcação; aparece quem quiser"). There's a recurring dispute about 21 vs 23 September — record it in the
  blackout `detail`/`note`, don't silently pick one. Point the blackout `source` at the message(s) that
  state the rule.
- **Don't trust the "Central de reservas" categories blindly.** People listed under "solo" sometimes said
  "com companhia" in surrounding messages — cross-reference and put the nuance in `notes`. Quote nothing
  you didn't see; keep message `text` verbatim (smart quotes and all).
- **Flag genuine ambiguity, don't invent it.** "(a confirmar)", "talvez", overlapping dates for two
  people → set `review:"ambiguous"` (or `"conflict"` + `conflictsWith`) with a short `reviewNote`. If
  everything is clean, `needsReview` is 0 — that's fine.
- **People & colors (0-8):** the canonical name → color → `aliases` map lives in the `people[]` array of
  the local `data/casa.json` (the decrypted source). Read it from there — it is intentionally NOT
  duplicated in this public doc. Each person keeps a stable color; spelling variants go in `aliases`, and
  people who share a first name are still **distinct** and must keep different colors.
- `pipeline.scanned` = messages reviewed, `extracted` = `entries.length`, `needsReview` = entries with a
  `review`, `lastSync` = now (ISO).

Validate provenance before deploying:

```bash
python3 -c "import json;d=json.load(open('data/casa.json'));ids={m['id'] for m in d['thread']};
bad=[s for e in d['entries']+d['presence'] for s in e['source'] if s not in ids];
print('OK' if not bad else ('MISSING: '+', '.join(bad)))"
```

## 3. Build & deploy (one shot)

```bash
./deploy.sh "Update Costa calendar"
```

`deploy.sh` runs `./build.sh`, which **encrypts** `data/casa.json` → `data/casa.enc.json`
(PBKDF2-SHA256 → AES-256-GCM, via `scripts/encrypt.mjs`) and bundles esbuild → `dist/app.js`.
It then commits `data/casa.enc.json` (the **encrypted** data) + the bundle, pushes, and polls
GitHub Pages until live. If a UI change is involved, the same command rebuilds. Never print or store
the GitHub token.

> ⚠️ **`data/casa.json` is the plaintext secret — it is gitignored and must NEVER be committed.**
> Only `data/casa.enc.json` ships. The encryption needs the password: set `$COSTA_PASSWORD`
> before running (or you'll be prompted). Do not `git add data/casa.json` or `git add -f` it.

## 4. Sanity check

Open https://bernardo-cs.github.io/costa-calendar/ (or `npm run serve` locally) and confirm the new stays
appear, the summer period is hatched, and tapping a stay shows its source message.
