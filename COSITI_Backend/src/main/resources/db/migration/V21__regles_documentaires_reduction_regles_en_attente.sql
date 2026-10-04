-- V21__regles_documentaires_reduction_regles_en_attente.sql
-- Application du « Document des règles » v2.0 du 02/10/2026
-- (docs/COSITI_V1_DOCUMENT_DES_REGLES_MISE_A_JOUR_ADHESION_DOCUMENTS_DGA.md) et réduction des règles en attente
-- (Conception/REGLES_EN_ATTENTE_DE_VALIDATION.md). Uniquement additif ou de mise en cohérence ; aucune donnée métier
-- supprimée.

-- ------------------------------------------------------------------------------------------------
-- 1. Matrice documentaire centralisée (§17, §18, §19, §23, §38). Une ligne sans champ = la pièce elle-même ;
--    une ligne avec champ = une information que la pièce justifie. Chaque ligne porte son propre statut de
--    validation : §17 « une pièce ne doit devenir bloquante que lorsque COSITI a officiellement confirmé qu'elle
--    est obligatoire » -> seul niveau OBLIGATOIRE + statut 'C' bloque. Toutes les lignes sont 'V' à la création :
--    la structure est fixée par le document, le caractère obligatoire reste à confirmer (§50).
-- ------------------------------------------------------------------------------------------------
CREATE TABLE exigence_documentaire (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(60) NOT NULL UNIQUE,
    rubrique VARCHAR(20) NOT NULL CHECK (rubrique IN ('IDENTITE', 'COORDONNEES', 'ACTIVITE', 'CNPS', 'ADHESION')),
    type_document VARCHAR(40) NOT NULL,
    champ VARCHAR(60),
    libelle VARCHAR(160) NOT NULL,
    niveau VARCHAR(20) NOT NULL CHECK (niveau IN ('OBLIGATOIRE', 'CONDITIONNELLE', 'OPTIONNELLE', 'NON_APPLICABLE')),
    condition_application TEXT,
    verification_dga BOOLEAN NOT NULL DEFAULT true,
    statut_validation VARCHAR(1) NOT NULL DEFAULT 'V' CHECK (statut_validation IN ('C', 'A', 'V')),
    effectif_du DATE,
    effectif_jusquau DATE,
    actif BOOLEAN NOT NULL DEFAULT true,
    ordre INTEGER NOT NULL DEFAULT 0,
    cree_le TIMESTAMPTZ NOT NULL DEFAULT now(),
    cree_par VARCHAR(80),
    modifie_le TIMESTAMPTZ,
    modifie_par VARCHAR(80),
    version BIGINT NOT NULL DEFAULT 0,
    CONSTRAINT chk_exigence_periode CHECK (effectif_jusquau IS NULL OR effectif_du IS NULL OR effectif_jusquau >= effectif_du)
);

CREATE UNIQUE INDEX idx_exigence_piece_champ ON exigence_documentaire(type_document, COALESCE(champ, ''));

-- Matrice §18. Niveaux : « À valider » -> niveau proposé + statut 'V' ; « Si requis / Conditionnel / Selon
-- processus » -> CONDITIONNELLE (jamais bloquante sans condition confirmée).
INSERT INTO exigence_documentaire (code, rubrique, type_document, champ, libelle, niveau, condition_application,
                                   verification_dga, ordre) VALUES
    ('IDENTITE_PIECE',          'IDENTITE',    'CNI', NULL,          'Pièce d''identité officielle',      'OBLIGATOIRE',   NULL, true, 10),
    ('IDENTITE_NOM',            'IDENTITE',    'CNI', 'nom',         'Nom conforme',                       'OBLIGATOIRE',   NULL, true, 11),
    ('IDENTITE_PRENOMS',        'IDENTITE',    'CNI', 'prenoms',     'Prénom(s) conformes',                'OBLIGATOIRE',   NULL, true, 12),
    ('IDENTITE_DATE_NAISSANCE', 'IDENTITE',    'CNI', 'dateNaissance','Date de naissance conforme',        'OBLIGATOIRE',   NULL, true, 13),
    ('IDENTITE_NUMERO_PIECE',   'IDENTITE',    'CNI', 'numeroCni',   'Numéro de pièce conforme',           'OBLIGATOIRE',   NULL, true, 14),
    ('NAISSANCE_ACTE',          'IDENTITE',    'ACTE_NAISSANCE', NULL, 'Acte de naissance',                'CONDITIONNELLE',
        'Caractère obligatoire à valider (§50 point 2)', true, 20),
    ('NAISSANCE_ACTE_DATE',     'IDENTITE',    'ACTE_NAISSANCE', 'dateNaissance', 'Date de naissance (acte)', 'CONDITIONNELLE', NULL, true, 21),
    ('RESIDENCE_JUSTIFICATIF',  'COORDONNEES', 'JUSTIFICATIF_RESIDENCE', NULL, 'Justificatif de résidence', 'CONDITIONNELLE',
        'Si requis (§50 point 3)', true, 30),
    ('RESIDENCE_ADRESSE',       'COORDONNEES', 'JUSTIFICATIF_RESIDENCE', 'localisation', 'Adresse conforme', 'CONDITIONNELLE', NULL, true, 31),
    ('ACTIVITE_PIECE',          'ACTIVITE',    'PIECE_PROFESSIONNELLE', NULL, 'Preuve d''activité professionnelle', 'CONDITIONNELLE',
        'Si l''activité l''exige (§50 points 4 et 14)', true, 40),
    ('CNPS_PIECE',              'CNPS',        'PIECE_CNPS', NULL, 'Document CNPS',                         'CONDITIONNELLE',
        'Si un numéro CNPS est déclaré ou si la procédure l''exige (§50 point 5)', true, 50),
    ('CNPS_NUMERO',             'CNPS',        'PIECE_CNPS', 'numeroCnps', 'Numéro CNPS conforme',          'CONDITIONNELLE', NULL, true, 51),
    ('ADHESION_FORMULAIRE',     'ADHESION',    'FORMULAIRE_ADHESION', NULL, 'Formulaire / dossier d''adhésion', 'OBLIGATOIRE', NULL, true, 60),
    ('ADHESION_JUSTIFICATIF_FRAIS', 'ADHESION', 'PREUVE_PAIEMENT', NULL, 'Justificatif du frais d''adhésion', 'CONDITIONNELLE',
        'Selon le processus de remise des 1 000 FCFA (§50 points 9 et 10)', true, 70);

-- Ces trois paramètres sont remplacés par la matrice : la liste des pièces, celle des informations contrôlées par
-- la DGA et le caractère bloquant d'une pièce (désormais : obligatoire ET confirmée, §17).
DELETE FROM parametre WHERE cle IN ('DOCUMENTS_ADHERENT_OBLIGATOIRES', 'CONTROLE_DGA_CHAMPS_PAR_DOCUMENT',
                                    'ACTIVATION_EXIGE_DOCUMENTS');

-- ------------------------------------------------------------------------------------------------
-- 2. Métadonnées et versionnement des documents (§21, §22) — un remplacement ne détruit jamais l'historique.
-- ------------------------------------------------------------------------------------------------
ALTER TABLE document ADD COLUMN version_document INTEGER NOT NULL DEFAULT 1 CHECK (version_document >= 1);
ALTER TABLE document ADD COLUMN remplace_document_id UUID REFERENCES document(id) ON DELETE RESTRICT;
ALTER TABLE document ADD COLUMN motif_remplacement TEXT;
ALTER TABLE document ADD COLUMN valide_du DATE;
ALTER TABLE document ADD COLUMN valide_jusquau DATE;
ALTER TABLE document ADD COLUMN verifie_par UUID REFERENCES utilisateur(id) ON DELETE SET NULL;
ALTER TABLE document ADD COLUMN verifie_le TIMESTAMPTZ;
ALTER TABLE document ADD COLUMN commentaire_verification TEXT;
ALTER TABLE document ADD CONSTRAINT chk_document_validite CHECK (
    valide_jusquau IS NULL OR valide_du IS NULL OR valide_jusquau >= valide_du);
ALTER TABLE document ADD CONSTRAINT chk_document_remplacement_motive CHECK (
    remplace_document_id IS NULL OR motif_remplacement IS NOT NULL);
CREATE INDEX idx_document_remplace ON document(remplace_document_id) WHERE remplace_document_id IS NOT NULL;

-- ------------------------------------------------------------------------------------------------
-- 3. Statuts du document des règles : documentaire EN_VERIFICATION (§5) ; résultat NON_APPLICABLE et commentaire
--    obligatoire pour NON_CORRESPOND, NON_VERIFIABLE, DOCUMENT_MANQUANT, NON_LISIBLE (§14).
-- ------------------------------------------------------------------------------------------------
ALTER TABLE adherent DROP CONSTRAINT adherent_statut_controle_dga_check;
UPDATE adherent SET statut_controle_dga = 'EN_VERIFICATION' WHERE statut_controle_dga = 'EN_COURS';
ALTER TABLE adherent ADD CONSTRAINT adherent_statut_controle_dga_check CHECK (statut_controle_dga IN (
    'NON_SOUMIS', 'EN_ATTENTE_DGA', 'EN_VERIFICATION', 'CORRECTION_DEMANDEE', 'VALIDE', 'REJETE'));

ALTER TABLE controle_dga_champ DROP CONSTRAINT controle_dga_champ_statut_correspondance_check;
ALTER TABLE controle_dga_champ DROP CONSTRAINT chk_controle_champ_anomalie_motivee;
ALTER TABLE controle_dga_champ ADD CONSTRAINT controle_dga_champ_statut_correspondance_check CHECK (
    statut_correspondance IN ('CORRESPOND', 'NON_CORRESPOND', 'NON_VERIFIABLE', 'NON_LISIBLE', 'DOCUMENT_MANQUANT',
                              'NON_APPLICABLE'));
ALTER TABLE controle_dga_champ ADD CONSTRAINT chk_controle_champ_anomalie_motivee CHECK (
    statut_correspondance IS NULL OR statut_correspondance IN ('CORRESPOND', 'NON_APPLICABLE') OR commentaire IS NOT NULL);

-- Lien vers l'exigence contrôlée (§23) — nul pour les tours ouverts avant V21.
ALTER TABLE controle_dga_document ADD COLUMN exigence_id UUID REFERENCES exigence_documentaire(id) ON DELETE RESTRICT;
ALTER TABLE controle_dga_document ADD COLUMN niveau VARCHAR(20);
ALTER TABLE controle_dga_champ ADD COLUMN exigence_id UUID REFERENCES exigence_documentaire(id) ON DELETE RESTRICT;

-- ------------------------------------------------------------------------------------------------
-- 4. Identifiant de corrélation dans l'audit (§42) — colonne ajoutée, le journal reste append-only.
-- ------------------------------------------------------------------------------------------------
ALTER TABLE journal_audit ADD COLUMN correlation_id VARCHAR(80);
CREATE INDEX idx_journal_audit_correlation ON journal_audit(correlation_id) WHERE correlation_id IS NOT NULL;

-- ------------------------------------------------------------------------------------------------
-- 5. Paramètres.
-- ------------------------------------------------------------------------------------------------
-- Frais obligatoire avant activation : fixé par le document des règles v2.0 (§7 « chaque nouvel adhérent enregistré
-- est associé à un frais d'adhésion », §25 « Frais = 1 000 FCFA enregistré » dans la checklist d'activation).
UPDATE parametre SET statut_validation = 'C', modifie_le = now(), modifie_par = 'MIGRATION_V21_DOCUMENT_REGLES_V2',
       libelle = 'L''activation d''un adhérent exige un frais d''adhésion enregistré (document des règles v2.0, §7 et §25)'
WHERE cle = 'ACTIVATION_EXIGE_FRAIS_ADHESION';

-- [V] Répartition confirmée (REPARTITION_VERSEMENT, C) : 700 FCFA Sécurité sociale + reste Épargne. Quelle part
-- ouvre des droits n'est fixé par aucun document : par défaut, toutes les composantes (montant total du versement),
-- ce qui reproduit le calcul des droits en vigueur avant l'application de la répartition.
INSERT INTO parametre (cle, valeur, type_valeur, libelle, statut_validation) VALUES
    ('DROITS_COMPOSANTES_IMPUTABLES', 'CNPS,EPARGNE,COOPERATIVE', 'TEXTE',
     'Composantes d''affectation dont le montant ouvre des périodes de droits', 'V')
ON CONFLICT (cle) DO NOTHING;

-- Visibilité des agents (inventaire D-14) : TOUS = comportement actuel (tout porteur d'ORGANISATION:LIRE voit tous les
-- agents) ; SOI_ET_SUPERVISES = l'Agent ne voit que sa fiche, le Chef sa fiche et les agents qu'il supervise
-- (« Le Chef supervise les agents de son périmètre », Rôles des acteurs). Directions et Gestionnaire : toujours tous.
INSERT INTO parametre (cle, valeur, type_valeur, libelle, statut_validation) VALUES
    ('ORGANISATION_PERIMETRE_AGENTS', 'TOUS', 'TEXTE',
     'Agents visibles par un Agent ou un Chef : TOUS ou SOI_ET_SUPERVISES', 'V')
ON CONFLICT (cle) DO NOTHING;

-- ------------------------------------------------------------------------------------------------
-- 6. Validation d'une règle par la COSITI depuis l'application (passage d'un paramètre ou d'une exigence de 'V' à
--    'C', motivé et audité). Attribution [A] : PCA, plus haute autorité métier de la V1.
-- ------------------------------------------------------------------------------------------------
INSERT INTO permission (code, module, libelle) VALUES
    ('REGLE:VALIDER', 'ADMINISTRATION',
     'Valider une règle métier (paramètre ou exigence documentaire) au nom de la COSITI, motif obligatoire')
ON CONFLICT (code) DO NOTHING;

INSERT INTO role_permission (role_id, permission_id)
SELECT r.id, p.id FROM role r, permission p WHERE r.code = 'PCA' AND p.code = 'REGLE:VALIDER'
ON CONFLICT DO NOTHING;
