-- V15__correction_droits_raport_v1_lot1.sql
-- Vague 1/5 de « Conception/RAPORT_V1.md ». Ne modifie jamais V1 à V14 (déjà appliquées) : uniquement des
-- corrections additives.

-- ------------------------------------------------------------------------------------------------
-- §3.8/§4.9/§9.9 : la création et la gestion des comptes utilisateurs (rôles métier) reviennent au PCA,
-- jamais au Super Administrateur — « le SA n'est pas un acteur métier », « aucune substitution ». La
-- désactivation reste accessible aux deux (le SA uniquement sur mémo du PCA — le mémo n'existe pas encore,
-- voir vague 2 ; en attendant, aucune régression : le comportement actuel du SA est conservé pour cette
-- seule action). ADMINISTRATION:GERER (création/modification/rôles) est retirée du SUPER_ADMIN et
-- remplacée par deux permissions dédiées, plus précises que le fourre-tout d'origine.
-- ------------------------------------------------------------------------------------------------
INSERT INTO permission (code, module, libelle) VALUES
    ('UTILISATEUR:GERER', 'ADMINISTRATION',
     'Créer un compte, modifier son profil ou ses rôles (réservé PCA — jamais AGENT_TERRAIN/CHEF_AGENT_TERRAIN/SUPER_ADMIN par cette voie)'),
    ('UTILISATEUR:DESACTIVER', 'ADMINISTRATION',
     'Désactiver ou réactiver un compte (PCA ; SUPER_ADMIN en attendant le mémo obligatoire de la vague 2)')
ON CONFLICT (code) DO NOTHING;

INSERT INTO role_permission (role_id, permission_id)
SELECT r.id, p.id FROM role r, permission p
WHERE r.code = 'PCA' AND p.code IN ('UTILISATEUR:GERER', 'UTILISATEUR:DESACTIVER', 'ADMINISTRATION:LIRE')
ON CONFLICT DO NOTHING;

INSERT INTO role_permission (role_id, permission_id)
SELECT r.id, p.id FROM role r, permission p
WHERE r.code = 'SUPER_ADMIN' AND p.code = 'UTILISATEUR:DESACTIVER'
ON CONFLICT DO NOTHING;

-- Le SA garde ADMINISTRATION:GERER pour la seule action qu'il lui reste (réinitialisation de mot de passe) —
-- retrait de la création/modification/rôles de comptes, désormais couverte par UTILISATEUR:GERER (PCA seul).
-- La création d'agents de terrain par la DGA (ORGANISATION:GERER, ServiceAgentImpl.creerParDga) existe déjà
-- et n'est pas concernée par cette migration.

-- ------------------------------------------------------------------------------------------------
-- §7.2/§6.3 : un changement de pack ou d'allocation après création n'est plus appliqué directement par la
-- Gestionnaire — elle le propose, le DAF le valide (séparation des tâches, §17 du correctif précédent).
-- ------------------------------------------------------------------------------------------------
INSERT INTO permission (code, module, libelle) VALUES
    ('ADHERENT:PROPOSER_ALLOCATION', 'ADHERENT',
     'Proposer un changement de pack/allocation pour un adhérent (Gestionnaire) — ne l''applique pas'),
    ('ADHERENT:VALIDER_ALLOCATION', 'ADHERENT',
     'Valider ou rejeter un changement de pack/allocation proposé (réservé DAF)')
ON CONFLICT (code) DO NOTHING;

INSERT INTO role_permission (role_id, permission_id)
SELECT r.id, p.id FROM role r, permission p
WHERE r.code = 'GESTIONNAIRE_COMPTE' AND p.code = 'ADHERENT:PROPOSER_ALLOCATION'
ON CONFLICT DO NOTHING;

INSERT INTO role_permission (role_id, permission_id)
SELECT r.id, p.id FROM role r, permission p
WHERE r.code = 'DAF' AND p.code = 'ADHERENT:VALIDER_ALLOCATION'
ON CONFLICT DO NOTHING;

CREATE TABLE demande_changement_allocation (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    adherent_id UUID NOT NULL REFERENCES adherent(id) ON DELETE CASCADE,
    pack_id UUID REFERENCES pack(id) ON DELETE RESTRICT,
    montant_reference NUMERIC(14,2) NOT NULL CHECK (montant_reference > 0),
    allocation_securite_sociale NUMERIC(14,2) NOT NULL CHECK (allocation_securite_sociale >= 700),
    allocation_epargne NUMERIC(14,2) NOT NULL CHECK (allocation_epargne >= 0),
    statut VARCHAR(20) NOT NULL DEFAULT 'EN_ATTENTE' CHECK (statut IN ('EN_ATTENTE', 'VALIDEE', 'REJETEE')),
    proposee_par UUID REFERENCES utilisateur(id) ON DELETE SET NULL,
    proposee_le TIMESTAMPTZ NOT NULL DEFAULT now(),
    decidee_par UUID REFERENCES utilisateur(id) ON DELETE SET NULL,
    decidee_le TIMESTAMPTZ,
    motif_decision TEXT,
    CONSTRAINT chk_demande_allocation_somme CHECK (allocation_securite_sociale + allocation_epargne = montant_reference)
);

CREATE INDEX idx_demande_allocation_adherent ON demande_changement_allocation(adherent_id, proposee_le DESC);
-- Une seule demande en attente à la fois par adhérent : en proposer une deuxième avant décision sur la
-- première créerait une ambiguïté sur celle qui prévaut.
CREATE UNIQUE INDEX idx_demande_allocation_unique_attente ON demande_changement_allocation(adherent_id)
    WHERE statut = 'EN_ATTENTE';

-- ------------------------------------------------------------------------------------------------
-- §6.5/§4.4 : objectif de recouvrement — proposé par la Gestionnaire ou le Chef, décidé par la DGA
-- (arbitrage, §6.11 : la DGA ne modifie jamais la proposition, elle approuve ou rejette avec motif).
-- ------------------------------------------------------------------------------------------------
INSERT INTO permission (code, module, libelle) VALUES
    ('ORGANISATION:PROPOSER_OBJECTIF', 'ORGANISATION',
     'Proposer un objectif de recouvrement pour un agent (Gestionnaire, Chef des agents de terrain)'),
    ('ORGANISATION:DECIDER_OBJECTIF', 'ORGANISATION',
     'Approuver ou rejeter un objectif de recouvrement proposé (réservé DGA)')
ON CONFLICT (code) DO NOTHING;

INSERT INTO role_permission (role_id, permission_id)
SELECT r.id, p.id FROM role r, permission p
WHERE r.code IN ('GESTIONNAIRE_COMPTE', 'CHEF_AGENT_TERRAIN') AND p.code = 'ORGANISATION:PROPOSER_OBJECTIF'
ON CONFLICT DO NOTHING;

INSERT INTO role_permission (role_id, permission_id)
SELECT r.id, p.id FROM role r, permission p
WHERE r.code = 'DGA' AND p.code = 'ORGANISATION:DECIDER_OBJECTIF'
ON CONFLICT DO NOTHING;

CREATE TABLE objectif_recouvrement (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agent_id UUID NOT NULL REFERENCES agent(id) ON DELETE CASCADE,
    periode DATE NOT NULL, -- premier jour du mois concerné
    montant NUMERIC(14,2) NOT NULL CHECK (montant > 0),
    statut VARCHAR(20) NOT NULL DEFAULT 'PROPOSE' CHECK (statut IN ('PROPOSE', 'APPROUVE', 'REJETE')),
    propose_par UUID REFERENCES utilisateur(id) ON DELETE SET NULL,
    propose_le TIMESTAMPTZ NOT NULL DEFAULT now(),
    decide_par UUID REFERENCES utilisateur(id) ON DELETE SET NULL,
    decide_le TIMESTAMPTZ,
    motif_decision TEXT
);

CREATE UNIQUE INDEX idx_objectif_recouvrement_unique ON objectif_recouvrement(agent_id, periode);

-- ------------------------------------------------------------------------------------------------
-- §6.4/§7.3 : le franchissement du seuil CNPS déclenche une alerte à la Gestionnaire — jusqu'ici seul le
-- paramètre existait (V1), jamais vérifié à l'exécution. Journalisation dédiée pour ne pas répéter
-- l'alerte à chaque paiement une fois le seuil déjà franchi.
-- ------------------------------------------------------------------------------------------------
ALTER TABLE adherent ADD COLUMN IF NOT EXISTS alerte_seuil_cnps_le TIMESTAMPTZ;
