import { http, HttpResponse } from "msw";
import type {
  Activite,
  Adherent,
  AdherentResume,
  CorpsCreationAdherent,
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
    agentReferentNom: null,
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

export const handlersAdherents = [
  http.get("/api/v1/packs", () => HttpResponse.json(PACKS_TEST)),

  http.get("/api/v1/activites", () => HttpResponse.json(ACTIVITES_TEST)),

  http.get("/api/v1/adherents", ({ request }) => {
    const url = new URL(request.url);
    const recherche = url.searchParams.get("recherche")?.toLowerCase();
    const statut = url.searchParams.get("statut");

    let contenu = ADHERENTS_TEST;
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

  http.get("/api/v1/adherents/:id", ({ params }) => {
    const adherent = ADHERENTS_TEST.find((a) => a.id === params.id);
    if (!adherent) {
      return HttpResponse.json(
        { code: "ADHERENT_INTROUVABLE", message: "Adhérent introuvable.", traceId: "t-adh-404", avertissements: [] },
        { status: 404 },
      );
    }
    return HttpResponse.json(adherent);
  }),

  http.post("/api/v1/adherents/verifier-doublon", async ({ request }) => {
    const corps = (await request.json()) as CorpsVerificationDoublon;
    // `zoneId` est obligatoire côté serveur (`VerifierDoublonDto`) : on le refuse ici aussi,
    // sinon le simulacre accepterait un appel que la vraie API rejette en 400 — ce qui est
    // précisément ce qui a masqué le défaut jusqu'au jalon J12.
    if (!corps.zoneId) {
      return HttpResponse.json(
        { code: "VALIDATION", message: "La zone est obligatoire pour la recherche de similarité.", traceId: "trace-doublon", avertissements: [] },
        { status: 400 },
      );
    }
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
      zoneId: corps.zoneId,
      associationId: corps.associationId ?? null,
      localisation: corps.localisation,
      quartier: corps.quartier ?? null,
      ville: corps.ville ?? null,
      dateAdhesion: corps.dateAdhesion,
      statut: "PREINSCRIT",
      inscriptionPayee: false,
    };
    return HttpResponse.json(nouveau, { status: 201, headers: { Location: `/api/v1/adherents/${nouveau.id}` } });
  }),
];
