import { http, HttpResponse } from "msw";

/**
 * Gestionnaires MSW pour les six tableaux de bord (J9). Forme alignée sur les DTO
 * backend réels (`cm.cositi.api.reporting.dto`).
 *
 * Chaque route renvoie `403` si le jeton courant n'a pas la permission
 * correspondante, comme le fait le serveur : c'est ce qui rend vérifiables les
 * cas de recette REC-H08 et REC-H09 côté frontend.
 */

const ZONES = [
  {
    zoneId: "zone-1",
    code: "DLA-C",
    libelle: "Douala Centre",
    nbAdherents: 120,
    nbActifs: 44,
    nbEnRetard: 31,
    cumulCollecte: 2_450_000,
    nbAgents: 4,
  },
  {
    zoneId: "zone-2",
    code: "DLA-N",
    libelle: "Douala Nord",
    nbAdherents: 52,
    nbActifs: 13,
    nbEnRetard: 18,
    cumulCollecte: 610_000,
    nbAgents: 2,
  },
];

/** Reprend le chiffre réel du projet : 57 adhérents actifs sur 172, soit 33,1 % d'activation. */
const INDICATEURS_GLOBAUX = [
  { cle: "adherents", libelle: "Adhérents enregistrés", valeur: 172, unite: "NOMBRE" },
  { cle: "adherentsActifs", libelle: "Adhérents ayant déjà cotisé", valeur: 57, unite: "NOMBRE" },
  { cle: "tauxActivation", libelle: "Taux d'activation", valeur: 0.3314, unite: "POURCENTAGE" },
  { cle: "collectePeriode", libelle: "Collecte validée sur la période", valeur: 3_060_000, unite: "MONTANT" },
];

const ALERTES = [
  {
    code: "JAMAIS_COTISE",
    niveau: "CRITIQUE",
    libelle: "Adhérents n'ayant jamais cotisé",
    nombre: 115,
    chemin: "/droits",
  },
  {
    code: "ADHERENTS_EN_RETARD",
    niveau: "ATTENTION",
    libelle: "Adhérents en retard de cotisation",
    nombre: 49,
    chemin: "/droits",
  },
];

/**
 * Refuse l'accès quand le jeton n'a pas la permission — le frontend doit afficher
 * le refus de l'API, jamais un tableau de bord vide.
 */
function refus() {
  return HttpResponse.json(
    { code: "ACCES_REFUSE", message: "Accès refusé.", traceId: "t-tb-403" },
    { status: 403 },
  );
}

export const handlersTableauxDeBord = [
  http.get("/api/v1/tableaux-de-bord/pca", () =>
    HttpResponse.json({
      indicateurs: INDICATEURS_GLOBAUX,
      zones: ZONES,
      alertes: ALERTES,
      rapportsDafDisponibles: 3,
      avertissements: [],
    }),
  ),

  http.get("/api/v1/tableaux-de-bord/dg", () =>
    HttpResponse.json({
      indicateurs: INDICATEURS_GLOBAUX,
      zones: ZONES,
      alertes: ALERTES,
      adherentsEnRetard: 49,
      avertissements: ["Les chiffres de synthèse datent de 92 minutes."],
    }),
  ),

  http.get("/api/v1/tableaux-de-bord/dga", () =>
    HttpResponse.json({
      indicateurs: [
        ...INDICATEURS_GLOBAUX,
        { cle: "agentsActifs", libelle: "Agents de terrain actifs", valeur: 6, unite: "NOMBRE" },
      ],
      zones: ZONES,
      agents: [
        {
          agentId: "ag-1",
          codeAgent: "AG-00001",
          nomComplet: "Ateba Jean",
          zoneLibelle: "Douala Centre",
          nbAdherentsPortefeuille: 42,
          nbPaiementsSaisis: 18,
          montantCollecte: 420_000,
        },
      ],
      alertes: ALERTES,
      comptesRendusConsolidesRecus: 2,
      objectifsTermes: [],
      avertissements: [],
    }),
  ),

  http.get("/api/v1/tableaux-de-bord/daf", () =>
    HttpResponse.json({
      indicateurs: [
        { cle: "montantValide", libelle: "Encaissements validés sur la période", valeur: 3_060_000, unite: "MONTANT" },
        { cle: "montantAControler", libelle: "En attente de contrôle", valeur: 180_000, unite: "MONTANT" },
        { cle: "paiementsAControler", libelle: "Paiements à contrôler", valeur: 7, unite: "NOMBRE" },
        { cle: "incoherences", libelle: "Incohérences signalées", valeur: 1, unite: "NOMBRE" },
      ],
      paiementsAControler: 7,
      paiementsIncoherence: 1,
      remisesEnEcart: 2,
      montantAControler: 180_000,
      montantValide: 3_060_000,
      alertes: [
        {
          code: "REMISES_EN_ECART",
          niveau: "CRITIQUE",
          libelle: "Remises de caisse présentant un écart",
          nombre: 2,
          chemin: null,
        },
      ],
      avertissements: [],
    }),
  ),

  http.get("/api/v1/tableaux-de-bord/gestionnaire", () =>
    HttpResponse.json({
      indicateurs: INDICATEURS_GLOBAUX,
      dossiersCnpsIncomplets: 8,
      eligiblesNonImmatricules: 5,
      declarationsAProduire: 3,
      comptesRendusAControler: 2,
      adherentsEnRetard: 49,
      alertes: ALERTES,
      avertissements: [],
    }),
  ),

  http.get("/api/v1/tableaux-de-bord/super-admin", () =>
    HttpResponse.json({
      indicateurs: [
        { cle: "utilisateursActifs", libelle: "Comptes actifs", valeur: 12, unite: "NOMBRE" },
        { cle: "utilisateursVerrouilles", libelle: "Comptes verrouillés", valeur: 1, unite: "NOMBRE" },
        { cle: "connexionsEchouees24h", libelle: "Échecs de connexion (24 h)", valeur: 4, unite: "NOMBRE" },
        { cle: "evenementsAudit24h", libelle: "Événements d'audit (24 h)", valeur: 318, unite: "NOMBRE" },
      ],
      utilisateursActifs: 12,
      utilisateursVerrouilles: 1,
      connexionsEchoueesDernieres24h: 4,
      parametresNonValides: 6,
      evenementsAuditDernieres24h: 318,
      alertes: [
        {
          code: "PARAMETRES_NON_VALIDES",
          niveau: "ATTENTION",
          libelle: "Règles métier non validées par la COSITI",
          nombre: 6,
          chemin: null,
        },
      ],
      avertissements: [],
    }),
  ),
];

export const refusTableauDeBord = refus;
