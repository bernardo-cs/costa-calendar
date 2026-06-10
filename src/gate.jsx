/* ============================================================
   gate.jsx — the password screen that stands in front of the app.
   Fetches the encrypted envelope (data/casa.enc.json), asks for a
   password, decrypts in-browser, then renders <App/>. The plaintext
   never leaves this tab. A correct password is remembered for the
   tab session (sessionStorage) so reloads don't re-prompt.
   ============================================================ */
import React from "react";
import { setData } from "./store.js";
import { App } from "./app.jsx";
import { decryptData, WrongPasswordError, CryptoUnavailableError } from "./crypto.js";

const { useState, useEffect, useRef, useCallback } = React;

const ENC_URL = "data/casa.enc.json";
const SS_KEY = "casa.pw"; // remembered password for this tab session

export function Gate() {
  const [envelope, setEnvelope] = useState(null);
  const [loadError, setLoadError] = useState(null);
  const [pw, setPw] = useState("");
  const [remember, setRemember] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [unlocked, setUnlocked] = useState(false);
  const inputRef = useRef(null);

  // Fetch the encrypted envelope once.
  useEffect(() => {
    let alive = true;
    fetch(ENC_URL, { cache: "no-cache" })
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then((env) => alive && setEnvelope(env))
      .catch((err) => alive && setLoadError(err.message || String(err)));
    return () => {
      alive = false;
    };
  }, []);

  const tryUnlock = useCallback(
    async (candidate, { remember }) => {
      setBusy(true);
      setError(null);
      try {
        const json = await decryptData(envelope, candidate);
        setData(json);
        if (remember) {
          try { sessionStorage.setItem(SS_KEY, candidate); } catch {}
        }
        setUnlocked(true);
      } catch (err) {
        try { sessionStorage.removeItem(SS_KEY); } catch {}
        if (err instanceof WrongPasswordError) {
          setError("Palavra-passe incorreta.");
        } else if (err instanceof CryptoUnavailableError) {
          setError("Este browser/contexto não permite desencriptar — usa HTTPS.");
        } else {
          setError("Não foi possível abrir os dados.");
        }
        setBusy(false);
      }
    },
    [envelope]
  );

  // Auto-unlock from a remembered session password.
  useEffect(() => {
    if (!envelope) return;
    let remembered = null;
    try { remembered = sessionStorage.getItem(SS_KEY); } catch {}
    if (remembered) tryUnlock(remembered, { remember: false });
    else inputRef.current?.focus();
  }, [envelope, tryUnlock]);

  if (unlocked) return <App />;

  const onSubmit = (e) => {
    e.preventDefault();
    if (!pw || busy || !envelope) return;
    if (pw.length < 8) {
      setError("A palavra-passe deve ter pelo menos 8 caracteres.");
      return;
    }
    tryUnlock(pw, { remember });
  };

  return (
    <div className="gate">
      <form className="gate-card" onSubmit={onSubmit}>
        <div className="gate-mark">🔒</div>
        <h1 className="gate-title serif">Calendário da Casa</h1>
        <p className="gate-sub">Esta agenda é privada. Introduz a palavra-passe para a abrir.</p>

        <input
          ref={inputRef}
          type="password"
          className="gate-input mono"
          placeholder="Palavra-passe"
          value={pw}
          autoComplete="current-password"
          onChange={(e) => { setPw(e.target.value); if (error) setError(null); }}
          disabled={busy || !envelope || !!loadError}
        />

        <label className="gate-remember">
          <input
            type="checkbox"
            checked={remember}
            onChange={(e) => setRemember(e.target.checked)}
            disabled={busy || !envelope || !!loadError}
          />
          Lembrar nesta sessão
        </label>

        <button
          type="submit"
          className="gate-btn"
          disabled={busy || !pw || !envelope || !!loadError}
        >
          {busy ? "A abrir…" : "Abrir"}
        </button>

        {error && <div className="gate-msg gate-err">{error}</div>}
        {loadError && (
          <div className="gate-msg gate-err mono">Falha a carregar os dados: {loadError}</div>
        )}
        {!envelope && !loadError && (
          <div className="gate-msg gate-faint">A carregar…</div>
        )}
      </form>
    </div>
  );
}
