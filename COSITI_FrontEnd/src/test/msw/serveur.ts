import { setupServer } from "msw/node";
import { handlersAuth } from "@/test/msw/handlers.auth";
import { handlersAdherents } from "@/test/msw/handlers.adherents";
import { handlersOrganisation } from "@/test/msw/handlers.organisation";
import { handlersPaiements } from "@/test/msw/handlers.paiements";

/**
 * Serveur MSW partagé par tous les tests. Chaque domaine ajoute son propre
 * fichier `handlers.<domaine>.ts` et l'enregistre ici — jamais de supposition
 * qu'un backend réel écoute pendant les tests (`AGENTS.md §5` et consignes de
 * session : « ne suppose jamais que le backend tourne »).
 */
export const serveur = setupServer(...handlersAuth, ...handlersAdherents, ...handlersOrganisation, ...handlersPaiements);
