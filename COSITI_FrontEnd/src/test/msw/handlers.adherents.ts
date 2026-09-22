import { http, HttpResponse } from "msw";
import type { Adherent, CorpsCreationAdherent, CorpsVerificationDoublon } from "@/api/adherents";

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

export const handlersAdherents = [
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

    return HttpResponse.json({
      contenu,
      page: 0,
      taille: 25,
      totalElements: contenu.length,
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
    const candidat = ADHERENTS_TEST.find((a) => a.telephonePrincipal === corps.telephonePrincipal.replace(/\D/g, ""));
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
