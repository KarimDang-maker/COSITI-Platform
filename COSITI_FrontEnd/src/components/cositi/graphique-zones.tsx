import { useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formaterMontant, formaterNombre, formaterPourcentage } from "@/lib/format";

/** Forme exacte de `LigneZone` (backend, jalon J9). */
export interface LigneZone {
  readonly zoneId: string;
  readonly code: string;
  readonly libelle: string;
  readonly nbAdherents: number;
  readonly nbActifs: number;
  readonly nbEnRetard: number;
  readonly cumulCollecte: number;
  readonly nbAgents: number;
}

/**
 * Recharts pose la couleur en attribut SVG et ne lit pas les variables CSS : c'est
 * le seul endroit du frontend où une valeur de couleur est lue hors des classes
 * Tailwind. Plutôt que de recopier les HEX de `tokens.css` (et risquer qu'ils
 * dérivent, comme constaté : la bordure recopiée ici avait glissé d'un caractère
 * par rapport à `--cositi-bordure`), on lit le jeton calculé sur `:root` à l'exécution.
 * Une seule série, donc une seule teinte : pas de palette catégorielle, pas de
 * légende (le titre nomme la mesure).
 */
function lireJeton(nom: string, repli: string): string {
  if (typeof window === "undefined") return repli;
  const valeur = getComputedStyle(document.documentElement).getPropertyValue(nom).trim();
  return valeur || repli;
}

type Mesure = "activation" | "collecte" | "retard";

const MESURES: Readonly<Record<Mesure, { libelle: string; valeur: (z: LigneZone) => number; format: (v: number) => string }>> = {
  activation: {
    libelle: "Taux d'activation",
    // Ratio, comme le serveur : la mise en forme en pourcentage reste à l'affichage.
    valeur: (z) => (z.nbAdherents === 0 ? 0 : z.nbActifs / z.nbAdherents),
    format: (v) => formaterPourcentage(v),
  },
  collecte: {
    libelle: "Cumul collecté",
    valeur: (z) => z.cumulCollecte,
    format: (v) => formaterMontant(v),
  },
  retard: {
    libelle: "Adhérents en retard",
    valeur: (z) => z.nbEnRetard,
    format: (v) => formaterNombre(v),
  },
};

interface GraphiqueZonesProps {
  zones: readonly LigneZone[];
}

/**
 * Comparaison des zones sur une mesure à la fois (J9).
 *
 * <p>Barres horizontales : les libellés de zone sont des mots, et un axe vertical
 * les rend lisibles sans rotation. Une seule mesure affichée à la fois — jamais
 * deux échelles sur un même graphique, qui ferait comparer des grandeurs sans
 * rapport.</p>
 *
 * <p>Le tableau des mêmes chiffres est accessible d'un bouton : il sert autant la
 * lecture au clavier et au lecteur d'écran que la vérification d'un montant
 * exact, qu'un graphique ne donne jamais.</p>
 */
export function GraphiqueZones({ zones }: GraphiqueZonesProps) {
  const [mesure, setMesure] = useState<Mesure>("activation");
  const [tableauVisible, setTableauVisible] = useState(false);

  if (zones.length === 0) {
    return (
      <p className="rounded-lg border border-dashed border-bordure-forte p-6 text-center text-texte-doux">
        Aucune zone à comparer.
      </p>
    );
  }

  const couleurs = useMemo(
    () => ({
      serie: lireJeton("--primaire", "#146b45"),
      grille: lireJeton("--bordure", "#e3e8e6"),
      axe: lireJeton("--texte-doux", "#6b7280"),
    }),
    [],
  );

  const definition = MESURES[mesure];
  const donnees = zones
    .map((zone) => ({
      libelle: zone.libelle,
      valeur: definition.valeur(zone),
      zone,
    }))
    .sort((a, b) => b.valeur - a.valeur);

  return (
    <section className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-lg font-semibold text-titre">{definition.libelle} par zone</h2>
        <div className="flex flex-wrap gap-2">
          {(Object.keys(MESURES) as Mesure[]).map((cle) => (
            <Button
              key={cle}
              size="sm"
              variant={cle === mesure ? "default" : "outline"}
              aria-pressed={cle === mesure}
              onClick={() => setMesure(cle)}
            >
              {MESURES[cle].libelle}
            </Button>
          ))}
          <Button size="sm" variant="outline" onClick={() => setTableauVisible((v) => !v)}>
            {tableauVisible ? "Masquer le tableau" : "Voir le tableau"}
          </Button>
        </div>
      </div>

      <div className="rounded-lg border border-bordure bg-surface p-4">
        <ResponsiveContainer width="100%" height={Math.max(180, donnees.length * 44)}>
          <BarChart data={donnees} layout="vertical" margin={{ top: 8, right: 24, bottom: 8, left: 8 }}>
            {/* Grille discrète, sur l'axe des valeurs seulement : elle aide à lire, elle ne décore pas. */}
            <CartesianGrid horizontal={false} stroke={couleurs.grille} />
            <XAxis
              type="number"
              tickFormatter={(valeur: number) => definition.format(valeur)}
              stroke={couleurs.axe}
              tick={{ fontSize: 12 }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              type="category"
              dataKey="libelle"
              width={140}
              stroke={couleurs.axe}
              tick={{ fontSize: 12 }}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip
              cursor={{ fill: "rgba(20, 107, 69, 0.06)" }}
              // Recharts type la valeur en `ValueType | undefined` : on la ramène à un nombre plutôt que
              // de forcer le type, une valeur absente devant s'afficher comme un zéro et non planter.
              formatter={(valeur) => [definition.format(Number(valeur ?? 0)), definition.libelle]}
              contentStyle={{ borderRadius: 8, border: `1px solid ${couleurs.grille}`, fontSize: 13 }}
            />
            <Bar dataKey="valeur" radius={[0, 4, 4, 0]} barSize={18}>
              {donnees.map((ligne) => (
                <Cell key={ligne.zone.zoneId} fill={couleurs.serie} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {tableauVisible && (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Zone</TableHead>
              <TableHead>Adhérents</TableHead>
              <TableHead>Ayant cotisé</TableHead>
              <TableHead>Taux d'activation</TableHead>
              <TableHead>En retard</TableHead>
              <TableHead>Cumul collecté</TableHead>
              <TableHead>Agents</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {donnees.map(({ zone }) => (
              <TableRow key={zone.zoneId}>
                <TableCell>{zone.libelle}</TableCell>
                <TableCell className="chiffre">{formaterNombre(zone.nbAdherents)}</TableCell>
                <TableCell className="chiffre">{formaterNombre(zone.nbActifs)}</TableCell>
                <TableCell className="chiffre">
                  {formaterPourcentage(zone.nbAdherents === 0 ? 0 : zone.nbActifs / zone.nbAdherents)}
                </TableCell>
                <TableCell className="chiffre">{formaterNombre(zone.nbEnRetard)}</TableCell>
                <TableCell className="chiffre">{formaterMontant(zone.cumulCollecte)}</TableCell>
                <TableCell className="chiffre">{formaterNombre(zone.nbAgents)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </section>
  );
}
