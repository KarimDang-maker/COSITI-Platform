-- V18__cotisations_rejet_bilan_caisse.sql
-- Fonctionnalités « Gestion des cotisations » (docs/COSITI_GESTIONNAIRE_MODULES_BACKEND_122_FONCTIONNALITES.md §3).
-- Uniquement additif : ne modifie aucune migration déjà appliquée.

-- ------------------------------------------------------------------------------------------------
-- #17 — Rejet d'un paiement par le validateur. Distinct de l'annulation (retrait par l'auteur ou le DAF)
-- et du signalement d'incohérence (corrigible) : un rejet est définitif, motivé et tracé.
-- ------------------------------------------------------------------------------------------------
ALTER TABLE paiement DROP CONSTRAINT IF EXISTS paiement_statut_check;
ALTER TABLE paiement ADD CONSTRAINT paiement_statut_check CHECK (
    statut IN ('BROUILLON', 'A_CONTROLER', 'VALIDE', 'RAPPROCHE', 'ANNULE', 'INCOHERENCE', 'REJETE'));

ALTER TABLE paiement ADD COLUMN motif_rejet TEXT;
ALTER TABLE paiement ADD COLUMN rejete_par UUID REFERENCES utilisateur(id) ON DELETE SET NULL;
ALTER TABLE paiement ADD COLUMN rejete_le TIMESTAMPTZ;
ALTER TABLE paiement ADD CONSTRAINT chk_rejet_motive CHECK (
    (statut <> 'REJETE') OR (motif_rejet IS NOT NULL AND rejete_par IS NOT NULL AND rejete_le IS NOT NULL));

-- #13 — recherche de doublon par référence de transaction (insensible à la casse et aux espaces).
CREATE INDEX idx_paiement_reference ON paiement(mode_paiement, lower(trim(reference_transaction)))
    WHERE reference_transaction IS NOT NULL;

-- ------------------------------------------------------------------------------------------------
-- #29 à #33 — Bilan journalier de caisse : montant physique compté, comparé au montant numérique
-- enregistré dans la plateforme. Un seul bilan par date (unicité), aucune suppression physique.
-- ------------------------------------------------------------------------------------------------
CREATE TABLE bilan_caisse_journalier (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    date_bilan DATE NOT NULL UNIQUE CHECK (date_bilan <= CURRENT_DATE),
    montant_numerique NUMERIC(14,2) NOT NULL CHECK (montant_numerique >= 0),
    montant_physique NUMERIC(14,2) NOT NULL CHECK (montant_physique >= 0),
    ecart NUMERIC(14,2) NOT NULL,
    nombre_paiements INTEGER NOT NULL CHECK (nombre_paiements >= 0),
    statut VARCHAR(20) NOT NULL DEFAULT 'SAISI' CHECK (statut IN ('SAISI', 'VALIDE', 'ANOMALIE')),
    commentaire TEXT,
    saisi_par UUID REFERENCES utilisateur(id) ON DELETE SET NULL,
    valide_par UUID REFERENCES utilisateur(id) ON DELETE SET NULL,
    valide_le TIMESTAMPTZ,
    commentaire_validation TEXT,
    motif_anomalie TEXT,
    signale_par UUID REFERENCES utilisateur(id) ON DELETE SET NULL,
    signale_le TIMESTAMPTZ,
    cree_le TIMESTAMPTZ NOT NULL DEFAULT now(),
    cree_par VARCHAR(80),
    modifie_le TIMESTAMPTZ,
    modifie_par VARCHAR(80),
    version BIGINT NOT NULL DEFAULT 0,
    CONSTRAINT chk_bilan_ecart_coherent CHECK (ecart = montant_physique - montant_numerique),
    CONSTRAINT chk_bilan_validation_coherente CHECK (
        (statut <> 'VALIDE') OR (valide_par IS NOT NULL AND valide_le IS NOT NULL)),
    CONSTRAINT chk_bilan_anomalie_motivee CHECK (
        (statut <> 'ANOMALIE') OR (motif_anomalie IS NOT NULL))
);

CREATE INDEX idx_bilan_caisse_statut ON bilan_caisse_journalier(statut, date_bilan DESC);

-- [V] Définition du « montant numérique » d'un bilan journalier. Aucun document COSITI ne la fixe :
-- proposition technique en attente de validation (AGENTS.md règle absolue n°1 et n°9).
INSERT INTO parametre (cle, valeur, type_valeur, libelle, statut_validation) VALUES
    ('BILAN_CAISSE_MODES_NUMERIQUE', 'ESPECES', 'TEXTE',
     'Modes de paiement dont le total enregistré est comparé à la caisse physique du bilan journalier', 'V'),
    ('BILAN_CAISSE_STATUTS_INCLUS', 'A_CONTROLER,VALIDE,RAPPROCHE,INCOHERENCE', 'TEXTE',
     'Statuts de paiement pris en compte dans le montant numérique du bilan journalier', 'V')
ON CONFLICT (cle) DO NOTHING;

-- ------------------------------------------------------------------------------------------------
-- Permissions du bilan journalier. Séparation saisie / validation (AGENTS.md règle absolue n°5) :
-- la Gestionnaire compte et saisit la caisse physique [A — à confirmer par la COSITI], le DAF valide
-- ou signale une anomalie (matrice §5 : « Validation bilan journalier : DAF »).
-- ------------------------------------------------------------------------------------------------
INSERT INTO permission (code, module, libelle) VALUES
    ('BILAN_CAISSE:LIRE', 'PAIEMENT', 'Consulter le bilan journalier de caisse et son écart'),
    ('BILAN_CAISSE:SAISIR', 'PAIEMENT', 'Saisir le montant physique compté pour le bilan journalier'),
    ('BILAN_CAISSE:VALIDER', 'PAIEMENT',
     'Valider un bilan journalier ou y signaler une anomalie (réservé DAF, jamais son propre bilan)')
ON CONFLICT (code) DO NOTHING;

INSERT INTO role_permission (role_id, permission_id)
SELECT r.id, p.id FROM role r, permission p
WHERE r.code IN ('PCA', 'DG', 'DGA', 'DAF', 'GESTIONNAIRE_COMPTE') AND p.code = 'BILAN_CAISSE:LIRE'
ON CONFLICT DO NOTHING;

INSERT INTO role_permission (role_id, permission_id)
SELECT r.id, p.id FROM role r, permission p
WHERE r.code = 'GESTIONNAIRE_COMPTE' AND p.code = 'BILAN_CAISSE:SAISIR'
ON CONFLICT DO NOTHING;

INSERT INTO role_permission (role_id, permission_id)
SELECT r.id, p.id FROM role r, permission p
WHERE r.code = 'DAF' AND p.code = 'BILAN_CAISSE:VALIDER'
ON CONFLICT DO NOTHING;
