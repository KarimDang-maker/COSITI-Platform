import { formaterMontant, formaterNombre, formaterPourcentage } from "@/lib/format";

/** Forme exacte de `IndicateurCle` (backend, jalon J9). */
export interface IndicateurCle {
  readonly cle: string;
  readonly libelle: string;
  readonly valeur: number;
  readonly unite: string;
}

/**
 * Met en forme une valeur selon l'unité **déclarée par le serveur**. Le serveur
 * ne renvoie jamais de chaîne déjà formatée : sans cela, la même donnée
 * s'afficherait différemment selon l'endpoint qui l'a produite.
 *
 * `POURCENTAGE` attend un ratio (0,331) et non un nombre déjà multiplié (33,1) —
 * c'est ce que `formaterPourcentage` consomme.
 */
export function formaterIndicateur(indicateur: IndicateurCle): string {
  switch (indicateur.unite) {
    case "MONTANT":
      return formaterMontant(indicateur.valeur);
    case "POURCENTAGE":
      return formaterPourcentage(indicateur.valeur);
    case "JOURS":
      return `${formaterNombre(indicateur.valeur)} j`;
    default:
      return formaterNombre(indicateur.valeur);
  }
}

interface CarteIndicateurProps {
  indicateur: IndicateurCle;
  /** Met la carte en avant : réservé à l'indicateur central d'un dashboard. */
  principal?: boolean;
}

/**
 * Valeur mise en avant d'un tableau de bord.
 *
 * Une valeur unique n'est pas un graphique : elle se lit mieux en chiffre, en
 * grand, avec son libellé. Aucun graphique n'est donc dessiné ici.
 */
export function CarteIndicateur({ indicateur, principal = false }: CarteIndicateurProps) {
  return (
    <div className="rounded-lg border border-bordure bg-surface p-4">
      <p className="text-sm text-texte-doux">{indicateur.libelle}</p>
      <p className={principal ? "chiffre text-4xl font-semibold text-titre" : "chiffre text-2xl font-semibold"}>
        {formaterIndicateur(indicateur)}
      </p>
    </div>
  );
}

interface RangeeIndicateursProps {
  indicateurs: readonly IndicateurCle[];
  /** Clé de l'indicateur à mettre en avant, généralement `tauxActivation`. */
  clePrincipale?: string;
}

export function RangeeIndicateurs({ indicateurs, clePrincipale }: RangeeIndicateursProps) {
  if (indicateurs.length === 0) return null;
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {indicateurs.map((indicateur) => (
        <CarteIndicateur
          key={indicateur.cle}
          indicateur={indicateur}
          principal={indicateur.cle === clePrincipale}
        />
      ))}
    </div>
  );
}
