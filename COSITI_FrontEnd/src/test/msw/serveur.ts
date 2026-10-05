import { setupServer } from "msw/node";
import { handlersAuth } from "@/test/msw/handlers.auth";
import { handlersAdherents } from "@/test/msw/handlers.adherents";
import { handlersOrganisation } from "@/test/msw/handlers.organisation";
import { handlersPaiements } from "@/test/msw/handlers.paiements";
import { handlersDroits } from "@/test/msw/handlers.droits";
import { handlersCnps } from "@/test/msw/handlers.cnps";
import { handlersComptesRendus } from "@/test/msw/handlers.comptesRendus";
import { handlersTableauxDeBord } from "@/test/msw/handlers.tableauxDeBord";
import { handlersRapports } from "@/test/msw/handlers.rapports";
import { handlersAdministration } from "@/test/msw/handlers.administration";
import { handlersWorkflow } from "@/test/msw/handlers.workflow";
import { handlersAdhesion } from "@/test/msw/handlers.adhesion";
import { handlersV21 } from "@/test/msw/handlers.v21";
import { handlersV22 } from "@/test/msw/handlers.v22";

/**
 * Serveur MSW partagé par tous les tests. Chaque domaine ajoute son propre
 * fichier `handlers.<domaine>.ts` et l'enregistre ici — jamais de supposition
 * qu'un backend réel écoute pendant les tests (`AGENTS.md §5` et consignes de
 * session : « ne suppose jamais que le backend tourne »).
 */
export const serveur = setupServer(
  ...handlersV22,
  ...handlersAuth,
  ...handlersAdherents,
  ...handlersOrganisation,
  ...handlersPaiements,
  ...handlersDroits,
  ...handlersCnps,
  ...handlersComptesRendus,
  ...handlersTableauxDeBord,
  ...handlersRapports,
  ...handlersAdministration,
  ...handlersWorkflow,
  ...handlersAdhesion,
  ...handlersV21,
);
