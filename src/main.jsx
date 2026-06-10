/* ============================================================
   main.jsx — entry point.
   The data ships encrypted (data/casa.enc.json). <Gate/> asks for a
   password, decrypts it in-browser, populates the store, and only
   then renders <App/>. The plaintext never travels over the wire.
   ============================================================ */
import React from "react";
import { createRoot } from "react-dom/client";
import { Gate } from "./gate.jsx";

const root = createRoot(document.getElementById("root"));
root.render(<Gate />);
