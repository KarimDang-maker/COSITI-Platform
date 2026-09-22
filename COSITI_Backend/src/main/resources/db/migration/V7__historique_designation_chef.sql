-- V7__historique_designation_chef.sql
-- Jalon J3 : historisation de la désignation/du remplacement du Chef des agents de terrain,
-- et traçabilité de la création d'un Agent par la DGA (docs/01_SCHEMA_BDD.md §2 « historique_designation_chef »,
-- « agent.cree_par_dga_id »). Contrat non confirmé par la COSITI ([A]) — décision d'implémentation documentée
-- ci-dessous et dans docs/03_SPECIFICATIONS_API.md / Conception/SUIVI_EXECUTION.md.
--
-- Décision d'implémentation : le mécanisme réel de désignation reste agent.chef_agent_id, DÉJÀ présent
-- depuis V2 (auto-référence agent -> agent) : ce champ pointe, pour un agent donné, vers l'agent qui EST
-- actuellement son Chef (supervision descendante). Désigner un Chef pour une zone met à jour ce champ pour
-- tous les agents actifs non archivés de la zone (hors le Chef lui-même). Le périmètre retenu pour la
-- contrainte « un seul Chef actif » est la ZONE de l'agent désigné (à confirmer avec la COSITI — voir
-- Conception/SUIVI_EXECUTION.md, tableau des décisions [A]/[V] en attente). Cette table sert à retrouver le
-- Chef courant d'une zone (dernier enregistrement) et à conserver l'historique complet des remplacements,
-- conformément à Roles des acteurs.md §13.3 (« action métier explicite et auditée »).

ALTER TABLE agent ADD COLUMN cree_par_dga_id UUID REFERENCES utilisateur(id) ON DELETE SET NULL;

-- Génération atomique du code agent (jamais MAX(...)+1, même principe que seq_matricule_adherent).
CREATE SEQUENCE seq_code_agent START WITH 1 INCREMENT BY 1;

CREATE TABLE historique_designation_chef (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    zone_id UUID NOT NULL REFERENCES zone(id) ON DELETE RESTRICT,
    agent_id UUID NOT NULL REFERENCES agent(id) ON DELETE RESTRICT,
    agent_remplace_id UUID REFERENCES agent(id) ON DELETE SET NULL,
    designe_par UUID NOT NULL REFERENCES utilisateur(id) ON DELETE RESTRICT,
    motif VARCHAR(200),
    horodatage TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_historique_chef_zone ON historique_designation_chef(zone_id, horodatage DESC);
CREATE INDEX idx_historique_chef_agent ON historique_designation_chef(agent_id);
