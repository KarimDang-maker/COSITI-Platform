import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./styles/globals.css";
import { App } from "./app/App";

const conteneur = document.getElementById("root");
if (!conteneur) throw new Error("Élément #root introuvable dans index.html.");

createRoot(conteneur).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
