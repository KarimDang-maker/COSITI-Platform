import { http, HttpResponse } from "msw";
import type {
  Activite,
  Adherent,
  AdherentResume,
  ChampManquant,
  CorpsCreationAdherent,
  CorpsModificationAdherent,
  CorpsModificationCoordonnees,
  CorpsVerificationDoublon,
  Pack,
} from "@/api/adherents";

// `GET /adherents/:id/situation` (J2) a été retiré au jalon J6 : consolidé
// sur `GET /droits/adherents/:id`, voir `test/msw/handlers.droits.ts` et
// `src/api/droits.ts`.

export const ADHERENTS_TEST: readonly Adherent[] = [
  {
    id: "adh-1",
    matricule: "COSITI-00001",
    nom: "NDONGO",
    prenoms: "Marie Claire",
    dateNaissance: "1990-04-12",
    sexe: "F",
    telephonePrincipal: "677000937",
    telephoneSecondaire: null,
    numeroCni: null,
    numeroCnps: null,
    activiteId: "act-1",
    activiteNom: "Vendeuse",
    zoneId: "zone-1",
    zoneLibelle: "Douala - Bonabéri",
    associationId: null,
    localisation: "Marché central",
    quartier: "Bonabéri",
    ville: "Douala",
    dateAdhesion: "2025-01-10",
    statut: "ACTIF",
    inscriptionPayee: true,
    agentReferentNom: "Ateba Jean",
    statutValidation: "VALIDE",
    version: 3,
  },
  {
    id: "adh-2",
    matricule: "COSITI-00002",
    nom: "ATANGANA",
    prenoms: "Paul",
    dateNaissance: null,
    sexe: "M",
    telephonePrincipal: "690112233",
    telephoneSecondaire: null,
    numeroCni: null,
    numeroCnps: null,
    activiteId: "act-2",
    zoneId: "zone-2",
    zoneLibelle: "Yaoundé - Mfoundi",
    associationId: null,
    localisation: "Marché Mokolo",
    quartier: null,
    ville: "Yaoundé",
    dateAdhesion: "2025-03-02",
    statut: "EN_RETARD",
    inscriptionPayee: true,
    whatsapp: "690112233",
    email: "paul.atangana@exemple.cm",
    agentReferentNom: null,
    statutValidation: "BROUILLON",
    version: 1,
  },
];

/**
 * Référentiel des activités, alimenté par la migration V2 côté serveur. Des identifiants
 * en forme d'UUID : `activiteId` en est un côté API, et un jeu de test qui l'ignorerait
 * laisserait passer une saisie que le vrai serveur refuse.
 */
export const ACTIVITES_TEST: readonly Activite[] = [
  { id: "11111111-1111-4111-8111-111111111111", code: "BAYAM_SELLAM", libelle: "Bayam-Sellam (Vivres frais, Marché)", categorie: "COMMERCE_ALIMENTAIRE" },
  { id: "22222222-2222-4222-8222-222222222222", code: "TRANSPORTEUR", libelle: "Transporteur (Moto-taxi, Chauffeur)", categorie: "TRANSPORT" },
];

/** Les deux packs COSITI, avec les montants de la migration V2. */
export const PACKS_TEST: readonly Pack[] = [
  {
    id: "33333333-3333-4333-8333-333333333333",
    code: "PACK_700",
    libelle: "Pack Essentiel 700 F/jour",
    montantJournalier: 700,
    montantMensuelEquivalent: 21000,
    seuilEligibiliteCnps: 10500,
    actif: true,
  },
  {
    id: "44444444-4444-4444-8444-444444444444",
    code: "PACK_ARCHIVE",
    libelle: "Pack retire du catalogue",
    montantJournalier: 500,
    montantMensuelEquivalent: 15000,
    seuilEligibiliteCnps: 7500,
    actif: false,
  },
];

/** Champs de complétion manquants — clés du paramètre `[V]` `CHAMPS_COMPLETION_ADHERENT`. */
export const CHAMPS_MANQUANTS_TEST: readonly ChampManquant[] = [
  { cle: "NUMERO_CNI", libelle: "Numéro CNI" },
  { cle: "GEOLOCALISATION", libelle: "Géolocalisation" },
  { cle: "ASSOCIATION", libelle: "Association" },
  { cle: "CONSENTEMENT", libelle: "Consentement au traitement des données" },
];

export const AVERTISSEMENT_COMPLETION =
  "La liste des champs de complétion (CHAMPS_COMPLETION_ADHERENT) n'est pas validée par la COSITI.";

/** Workflow V19 : toute modification directe d'un dossier validé est refusée (`ServiceAdherentImpl`). */
function refusDossierValide(id: unknown) {
  const adherent = ADHERENTS_TEST.find((a) => a.id === id);
  if (adherent?.statutValidation !== "VALIDE") return null;
  return HttpResponse.json(
    {
      code: "ADHERENT_MODIFICATION_PAR_DEMANDE",
      message: "Ce dossier est validé : toute modification passe par une demande de modification.",
      traceId: "t-wf",
      avertissements: [],
    },
    { status: 409 },
  );
}

function introuvable() {
  return HttpResponse.json(
    { code: "ADHERENT_INTROUVABLE", message: "Adhérent introuvable.", traceId: "t-adh-404", avertissements: [] },
    { status: 404 },
  );
}

export const handlersAdherents = [
  http.get("/api/v1/packs", () => HttpResponse.json(PACKS_TEST)),

  http.get("/api/v1/activites", () => HttpResponse.json(ACTIVITES_TEST)),

  http.get("/api/v1/adherents", ({ request }) => {
    const url = new URL(request.url);
    const recherche = url.searchParams.get("recherche")?.toLowerCase();
    const statut = url.searchParams.get("statut");
    const telephone = url.searchParams.get("telephone");
    const tri = url.searchParams.get("tri");

    // Liste blanche réelle du contrôleur (#8). L'écran envoyait auparavant `tri=nom,asc`, que le serveur
    // refuse en 400 : un simulacre permissif avait laissé passer ce défaut.
    if (tri && !["NOM", "MATRICULE", "DATE_ADHESION", "STATUT"].includes(tri)) {
      return HttpResponse.json(
        { code: "ADHERENT_TRI_INVALIDE", message: `Champ de tri inconnu : ${tri}.`, champ: "tri", traceId: "t-tri", avertissements: [] },
        { status: 400 },
      );
    }

    let contenu = ADHERENTS_TEST;
    if (telephone) contenu = contenu.filter((a) => a.telephonePrincipal.includes(telephone));
    if (recherche) {
      contenu = contenu.filter(
        (a) =>
          a.matricule.toLowerCase().includes(recherche) ||
          a.nom.toLowerCase().includes(recherche) ||
          (a.prenoms ?? "").toLowerCase().includes(recherche),
      );
    }
    if (statut) contenu = contenu.filter((a) => a.statut === statut);

    // `GET /adherents` ne renvoie **pas** la fiche complète mais un résumé (`AdherentResumeDto`).
    // Ce simulacre le reproduit fidèlement : tant qu'il renvoyait la fiche entière, l'écran
    // lisait des champs que la vraie API ne donne pas, et les tests n'y voyaient rien.
    const resumes: AdherentResume[] = contenu.map((a) => ({
      id: a.id,
      matricule: a.matricule,
      nomComplet: `${a.nom} ${a.prenoms ?? ""}`.trim(),
      telephonePrincipal: a.telephonePrincipal,
      zoneId: a.zoneId,
      zoneLibelle: a.zoneLibelle ?? null,
      dateAdhesion: a.dateAdhesion,
      statut: a.statut,
    }));

    return HttpResponse.json({
      contenu: resumes,
      page: 0,
      taille: 25,
      totalElements: resumes.length,
      totalPages: 1,
      avertissements: [],
    });
  }),

  http.get("/api/v1/adherents/matricule/:matricule", ({ params }) => {
    const adherent = ADHERENTS_TEST.find((a) => a.matricule === params.matricule);
    return adherent ? HttpResponse.json(adherent) : introuvable();
  }),

  http.get("/api/v1/adherents/:id", ({ params }) => {
    const adherent = ADHERENTS_TEST.find((a) => a.id === params.id);
    return adherent ? HttpResponse.json(adherent) : introuvable();
  }),

  http.put("/api/v1/adherents/:id", async ({ params, request }) => {
    const refus = refusDossierValide(params.id);
    if (refus) return refus;
    const adherent = ADHERENTS_TEST.find((a) => a.id === params.id);
    if (!adherent) return introuvable();
    const corps = (await request.json()) as CorpsModificationAdherent;
    return HttpResponse.json({ ...adherent, ...corps });
  }),

  http.post("/api/v1/adherents/:id/statut", async ({ params, request }) => {
    const refus = refusDossierValide(params.id);
    if (refus) return refus;
    const adherent = ADHERENTS_TEST.find((a) => a.id === params.id);
    if (!adherent) return introuvable();
    const corps = (await request.json()) as { statut: string; motif: string };
    // Seules règles réelles du service : statut inchangé et adhérent radié refusés en 409.
    if (corps.statut === adherent.statut) {
      return HttpResponse.json(
        { code: "ADHERENT_STATUT_INCHANGE", message: "L'adhérent a déjà ce statut.", traceId: "t-statut", avertissements: [] },
        { status: 409 },
      );
    }
    return new HttpResponse(null, { status: 204 });
  }),

  http.post("/api/v1/adherents/:id/archiver", () => new HttpResponse(null, { status: 204 })),

  http.get("/api/v1/adherents/:id/completion", ({ params }) =>
    HttpResponse.json({
      adherentId: params.id,
      pourcentage: 60,
      champsRenseignes: 6,
      champsTotal: 10,
      champsManquants: CHAMPS_MANQUANTS_TEST,
      avertissements: [AVERTISSEMENT_COMPLETION],
    }),
  ),

  http.get("/api/v1/adherents/:id/champs-manquants", () => HttpResponse.json(CHAMPS_MANQUANTS_TEST)),

  http.patch("/api/v1/adherents/:id/profil", async ({ params }) => {
    const adherent = ADHERENTS_TEST.find((a) => a.id === params.id);
    return adherent ? HttpResponse.json(adherent) : introuvable();
  }),

  http.get("/api/v1/adherents/:id/dossier", ({ params }) => {
    const adherent = ADHERENTS_TEST.find((a) => a.id === params.id);
    if (!adherent) return introuvable();
    return HttpResponse.json({
      adherentId: adherent.id,
      statut: adherent.statut,
      completionPourcentage: 60,
      champsManquants: CHAMPS_MANQUANTS_TEST,
      documentsManquants: ["ACTE_NAISSANCE"],
      avertissements: [AVERTISSEMENT_COMPLETION],
    });
  }),

  http.get("/api/v1/adherents/:id/documents-manquants", () => HttpResponse.json(["ACTE_NAISSANCE"])),

  http.get("/api/v1/adherents/:id/historique", ({ params }) =>
    HttpResponse.json([
      {
        id: "audit-2",
        horodatage: "2026-09-20T09:30:00Z",
        utilisateurId: "u-gc-1",
        utilisateurIdentifiant: "gestionnaire.test",
        typeOperation: "ADHERENT_CHANGEMENT_STATUT",
        entite: "adherent",
        entiteId: params.id,
        motif: "Trois mois sans cotisation",
        resultat: "SUCCES",
      },
      {
        id: "audit-1",
        horodatage: "2025-03-02T08:00:00Z",
        utilisateurId: "u-gc-1",
        utilisateurIdentifiant: "gestionnaire.test",
        typeOperation: "ADHERENT_CREATION",
        entite: "adherent",
        entiteId: params.id,
        motif: null,
        resultat: "SUCCES",
      },
    ]),
  ),

  http.get("/api/v1/adherents/:id/agent", ({ params }) => {
    // adh-1 est suivie par l'agent-1 ; adh-2 n'a aucun agent (état métier normal, 404 dédié).
    if (params.id === "adh-1") {
      return HttpResponse.json({
        id: "agent-1",
        codeAgent: "AG-00001",
        nomComplet: "Ateba Jean",
        telephone: "677000001",
        zoneId: "zone-1",
        actif: true,
      });
    }
    return HttpResponse.json(
      { code: "ADHERENT_SANS_AGENT", message: "Aucun agent n'est actuellement affecté à cet adhérent.", traceId: "t-agent", avertissements: [] },
      { status: 404 },
    );
  }),

  http.get("/api/v1/adherents/:id/resume-cotisations", ({ params }) =>
    HttpResponse.json({
      adherentId: params.id,
      montantValide: 9000,
      montantEnAttente: 1400,
      seuilEligibiliteCnps: 10500,
      resteAvantSeuil: 1500,
      pourcentageProgression: 86,
      eligibleCnps: false,
      couvertJusquAu: "2026-08-15",
      avertissements: [],
    }),
  ),

  http.get("/api/v1/adherents/:id/professionnel", ({ params }) => {
    const adherent = ADHERENTS_TEST.find((a) => a.id === params.id);
    if (!adherent) return introuvable();
    return HttpResponse.json({
      adherentId: adherent.id,
      activiteId: ACTIVITES_TEST[0]!.id,
      numeroCnps: adherent.numeroCnps,
      associationId: adherent.associationId,
      packIdCourant: PACKS_TEST[0]!.id,
    });
  }),

  http.put("/api/v1/adherents/:id/professionnel", async ({ params }) => {
    const adherent = ADHERENTS_TEST.find((a) => a.id === params.id);
    return adherent ? HttpResponse.json(adherent) : introuvable();
  }),

  http.get("/api/v1/adherents/:id/coordonnees", ({ params }) => {
    const adherent = ADHERENTS_TEST.find((a) => a.id === params.id);
    if (!adherent) return introuvable();
    return HttpResponse.json({
      adherentId: adherent.id,
      telephonePrincipal: adherent.telephonePrincipal,
      telephoneSecondaire: adherent.telephoneSecondaire,
      whatsapp: adherent.whatsapp ?? null,
      email: adherent.email ?? null,
      numeroCni: adherent.numeroCni,
      localisation: adherent.localisation,
      quartier: adherent.quartier,
      ville: adherent.ville,
      latitude: null,
      longitude: null,
    });
  }),

  http.put("/api/v1/adherents/:id/coordonnees", async ({ params, request }) => {
    const refus = refusDossierValide(params.id);
    if (refus) return refus;
    const adherent = ADHERENTS_TEST.find((a) => a.id === params.id);
    if (!adherent) return introuvable();
    const corps = (await request.json()) as CorpsModificationCoordonnees;
    return HttpResponse.json({ ...adherent, ...corps });
  }),

  http.post("/api/v1/adherents/verifier-doublon", async ({ request }) => {
    const corps = (await request.json()) as CorpsVerificationDoublon;
    // `zoneId` est obligatoire côté serveur (`VerifierDoublonDto`) : on le refuse ici aussi,
    // sinon le simulacre accepterait un appel que la vraie API rejette en 400 — ce qui est
    // précisément ce qui a masqué le défaut jusqu'au jalon J12.
    // V23 : `zoneId` devient facultatif (la création ne saisit plus la zone) — spécification backend V23 §3.
    const telephone = corps.telephonePrincipal?.replace(/\D/g, "") ?? "";
    const candidat = ADHERENTS_TEST.find((a) => a.telephonePrincipal === telephone);
    return HttpResponse.json({
      candidats: candidat
        ? [
            {
              adherentId: candidat.id,
              matricule: candidat.matricule,
              nomComplet: `${candidat.nom} ${candidat.prenoms ?? ""}`.trim(),
              telephone: `${candidat.telephonePrincipal[0]}•• ••• ${candidat.telephonePrincipal.slice(6)}`,
              scoreSimilarite: 92,
              motifCorrespondance: "Téléphone principal identique",
            },
          ]
        : [],
    });
  }),

  http.post("/api/v1/adherents", async ({ request }) => {
    const corps = (await request.json()) as CorpsCreationAdherent;
    const telephone = corps.telephonePrincipal.replace(/\D/g, "");
    const doublon = ADHERENTS_TEST.find((a) => a.telephonePrincipal === telephone);

    if (doublon && !corps.confirmationDoublonIgnore) {
      return HttpResponse.json(
        {
          code: "ADHERENT_DOUBLON_POTENTIEL",
          message: "Un doublon potentiel a été détecté.",
          traceId: "t-doublon",
          avertissements: [],
          candidats: [
            {
              adherentId: doublon.id,
              matricule: doublon.matricule,
              nomComplet: `${doublon.nom} ${doublon.prenoms ?? ""}`.trim(),
              telephone: `${doublon.telephonePrincipal[0]}•• ••• ${doublon.telephonePrincipal.slice(6)}`,
              scoreSimilarite: 92,
              motifCorrespondance: "Téléphone principal identique",
            },
          ],
        },
        { status: 409 },
      );
    }

    const nouveau: Adherent = {
      id: "adh-nouveau",
      matricule: "COSITI-00099",
      zoneLibelle: "Douala - Bonabéri",
      nom: corps.nom,
      prenoms: corps.prenoms ?? null,
      dateNaissance: corps.dateNaissance ?? null,
      sexe: corps.sexe ?? null,
      telephonePrincipal: telephone,
      telephoneSecondaire: corps.telephoneSecondaire ?? null,
      numeroCni: corps.numeroCni ?? null,
      numeroCnps: corps.numeroCnps ?? null,
      activiteId: corps.activiteId,
      // V23 : la zone et la localisation ne sont plus saisies à la création (attribuées par le serveur).
      zoneId: "zone-1",
      associationId: corps.associationId ?? null,
      localisation: corps.quartier ?? "",
      quartier: corps.quartier ?? null,
      ville: corps.ville ?? null,
      dateAdhesion: corps.dateAdhesion,
      statut: "PREINSCRIT",
      inscriptionPayee: false,
    };
    return HttpResponse.json(nouveau, { status: 201, headers: { Location: `/api/v1/adherents/${nouveau.id}` } });
  }),
];
