import { defineConfig, devices } from "@playwright/test";

/**
 * COSITI — Recette E2E (jalon J12).
 *
 * Les parcours vérifiés sont ceux de `Conception/Roles des acteurs.md §15`
 * (`REC-H01` à `REC-H15`). Chaque fichier de `e2e/` porte les identifiants
 * qu'il couvre dans son en-tête.
 *
 * **Ces tests s'exécutent contre la pile réelle** — API Spring Boot et
 * PostgreSQL compris. C'est leur raison d'être : les tests d'intégration
 * backend couvrent déjà les règles métier de bout en bout côté serveur, et les
 * tests Vitest couvrent les écrans contre une API simulée. Ce qu'aucun des deux
 * ne prouve, c'est que les deux moitiés se parlent correctement.
 *
 * Le serveur Vite est démarré automatiquement (`webServer`). L'API, elle, ne
 * l'est pas : elle demande une base migrée et des comptes de démonstration, ce
 * qui relève de l'orchestration d'environnement et non du lanceur de tests.
 * `outils/dev/e2e.ps1` (côté backend) fait cet enchaînement en local, et le
 * workflow CI le reproduit avec des services conteneurisés.
 */
/*
 * Port DISTINCT de 5173, et serveur jamais reutilise.
 *
 * Le port habituel de developpement porte tres souvent un serveur Vite deja lance, qui lit
 * `.env.development` — lequel epingle l'API sur le port 8082, donc sur la base de
 * DEVELOPPEMENT. Avec `reuseExistingServer`, la recette adoptait ce serveur et s'executait
 * contre la mauvaise pile sans qu'aucun message ne le signale : le garde-fou de
 * `outils/dev/e2e.ps1` verifie l'API qu'il demarre, pas celle que le navigateur appelle.
 * Posseder son propre serveur, sur son propre port, est la seule facon de le garantir.
 */
const PORT = Number(process.env.COSITI_E2E_PORT ?? 5174);
const URL_BASE = process.env.COSITI_E2E_URL ?? `http://localhost:${PORT}`;
const URL_API = process.env.VITE_API_BASE_URL ?? "http://localhost:8083/api/v1";

export default defineConfig({
  testDir: "./e2e",
  // Les parcours créent des adhérents et des paiements dans une base partagée :
  // les exécuter en parallèle produirait des doublons de téléphone et des
  // conflits de séquence. La recette est séquentielle, et c'est volontaire.
  fullyParallel: false,
  workers: 1,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [["github"], ["html", { open: "never" }]] : [["list"]],

  timeout: 60_000,
  expect: { timeout: 10_000 },

  use: {
    baseURL: URL_BASE,
    // Trace et capture conservées seulement sur échec : sur une connexion lente,
    // enregistrer chaque parcours coûterait plus que ça ne rapporte.
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "off",
    locale: "fr-FR",
    timezoneId: "Africa/Douala",
  },

  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],

  webServer: {
    // `--strictPort` : si le port est pris, echouer bruyamment plutot que glisser sur un
    // autre port pendant que `baseURL` continue de pointer ailleurs.
    command: `npm run dev -- --port ${PORT} --strictPort`,
    url: URL_BASE,
    reuseExistingServer: false,
    timeout: 120_000,
    // Transmis explicitement : `.env.development` designe l'API de developpement, et la
    // recette doit interroger la sienne.
    env: { VITE_API_BASE_URL: URL_API },
  },
});
