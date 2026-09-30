import { useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { CarteSection } from "@/components/cositi/carte-section";
import { EtatVide } from "@/components/cositi/etat-vide";
import { formaterMontant, formaterNombre, formaterPourcentage } from "@/lib/format";
import { lireJeton } from "@/lib/jetons";
import { cn } from "@/lib/utils";

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
 * Comparaison des zones sur une mesure à la fois (J9), dans une carte du
 * gabarit (« Revenue ») avec sélecteur de mesure segmenté.
 *
 * <p>Barres horizontales : les libellés de zone sont des mots, et un axe vertical
 * les rend lisibles sans rotation. Une seule mesure affichée à la fois — jamais
 * deux échelles sur un même graphique, qui ferait comparer des grandeurs sans
 * rapport. Une seule série, donc une seule teinte (`--graphique-serie-1`) : pas de
 * légende, le titre nomme la mesure.</p>
 *
 * <p>Le tableau des mêmes chiffres est accessible d'un bouton : il sert autant la
 * lecture au clavier et au lecteur d'écran que la vérification d'un montant
 * exact, qu'un graphique ne donne jamais.</p>
 */
export function GraphiqueZones({ zones }: GraphiqueZonesProps) {
  const [mesure, setMesure] = useState<Mesure>("activation");
  const [tableauVisible, setTableauVisible] = useState(false);

  if (zones.length === 0) {
    return <EtatVide titre="Aucune zone à comparer." description="Les zones apparaîtront ici dès leur création." />;
  }

  const definition = MESURES[mesure];
  const donnees = zones
    .map((zone) => ({
      libelle: zone.libelle,
      valeur: definition.valeur(zone),
      zone,
    }))
    .sort((a, b) => b.valeur - a.valeur);

  const couleurSerie = lireJeton("--graphique-serie-1");
  const couleurGrille = lireJeton("--graphique-grille");
  const couleurAxe = lireJeton("--graphique-axe");

  return (
    <CarteSection
      titre={`${definition.libelle} par zone`}
      description="Une mesure à la fois, zones classées de la plus forte à la plus faible."
      actions={
        <Button size="sm" variant="outline" onClick={() => setTableauVisible((v) => !v)}>
          {tableauVisible ? "Masquer le tableau" : "Voir le tableau"}
        </Button>
      }
    >
      <div className="space-y-5">
        <div className="inline-flex flex-wrap gap-1 rounded-lg bg-surface-survol p-1" role="group" aria-label="Mesure comparée">
          {(Object.keys(MESURES) as Mesure[]).map((cle) => (
            <Button
              key={cle}
              size="sm"
              variant="ghost"
              aria-pressed={cle === mesure}
              onClick={() => setMesure(cle)}
              className={cn(cle === mesure && "bg-surface text-titre shadow-legere hover:bg-surface")}
            >
              {MESURES[cle].libelle}
            </Button>
          ))}
        </div>

        <ResponsiveContainer width="100%" height={Math.max(180, donnees.length * 48)}>
          <BarChart data={donnees} layout="vertical" margin={{ top: 4, right: 24, bottom: 4, left: 4 }}>
            {/* Grille discrète, sur l'axe des valeurs seulement : elle aide à lire, elle ne décore pas. */}
            <CartesianGrid horizontal={false} stroke={couleurGrille} strokeDasharray="4 4" />
            <XAxis
              type="number"
              tickFormatter={(valeur: number) => definition.format(valeur)}
              stroke={couleurAxe}
              tick={{ fontSize: 12 }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              type="category"
              dataKey="libelle"
              width={140}
              stroke={couleurAxe}
              tick={{ fontSize: 12 }}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip
              cursor={{ fill: lireJeton("--graphique-survol") }}
              // Recharts type la valeur en `ValueType | undefined` : on la ramène à un nombre plutôt que
              // de forcer le type, une valeur absente devant s'afficher comme un zéro et non planter.
              formatter={(valeur) => [definition.format(Number(valeur ?? 0)), definition.libelle]}
              // Style en ligne : les variables CSS y sont résolues, contrairement aux attributs SVG.
              contentStyle={{
                borderRadius: "var(--rayon-md)",
                border: "1px solid var(--bordure)",
                boxShadow: "var(--ombre-flottante)",
                fontSize: "var(--taille-xs)",
              }}
            />
            <Bar dataKey="valeur" fill={couleurSerie} radius={[0, 6, 6, 0]} barSize={18} />
          </BarChart>
        </ResponsiveContainer>

        {tableauVisible && (
          <div className="overflow-hidden rounded-xl border border-bordure">
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
                    <TableCell className="font-semibold">{zone.libelle}</TableCell>
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
          </div>
        )}
      </div>
    </CarteSection>
  );
}
