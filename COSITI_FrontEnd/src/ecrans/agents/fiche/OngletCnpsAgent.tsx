import { VueSeuilCnps } from "@/ecrans/adherents/VueSeuilCnps";

/**
 * Suivi CNPS du portefeuille (#12 proches du seuil, #13 seuil atteint) — même présentation que les vues
 * globales de la liste des adhérents, restreinte par le serveur aux adhérents affectés à cet agent.
 * Visible avec `CNPS:LIRE` (masqué par l'appelant sinon).
 */
export function OngletCnpsAgent({ agentId }: { agentId: string }) {
  return (
    <div className="space-y-8">
      <section aria-labelledby="titre-cnps-proches" className="space-y-3">
        <h2 id="titre-cnps-proches">Proches du seuil CNPS</h2>
        <VueSeuilCnps mode="proches" agentId={agentId} />
      </section>
      <section aria-labelledby="titre-cnps-eligibles" className="space-y-3">
        <h2 id="titre-cnps-eligibles">Seuil atteint, non immatriculés</h2>
        <VueSeuilCnps mode="eligibles" agentId={agentId} />
      </section>
    </div>
  );
}
