-- V16__dossiers_prestation_cnps.sql
-- Module « Gestionnaire des comptes — Dossiers CNPS / PVID / Risques professionnels » (vague 1/4).
-- Voir Conception/Gestionaires de comptes/FONCTIONALITE_GestComtes_V1.md et V2.md (mockups) et
-- V2_BACK_FRONT.md (contrat technique — « ne jamais inventer un endpoint »).
--
-- dossier_cnps (V4) modélise l'IMMATRICULATION : un seul dossier par adhérent. Ce module ajoute le
-- DOSSIER DE PRESTATION (demande d'allocation familiale, de pension, d'accident du travail...) : plusieurs
-- dossiers possibles par adhérent dans le temps, organisés par rubrique (PF/RP/PVID) puis par offre.
-- Ne modifie jamais V1 à V15 (déjà appliquées) : uniquement des corrections additives.

-- ------------------------------------------------------------------------------------------------
-- Référentiel des offres par rubrique. Contenu repris tel quel des documents de spécification
-- (§16-19 de V1.md, §12-15 et §36-39 de V2.md) — jamais inventé.
-- ------------------------------------------------------------------------------------------------
CREATE TABLE offre_cnps (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    rubrique VARCHAR(10) NOT NULL CHECK (rubrique IN ('PF', 'RP', 'PVID')),
    code VARCHAR(40) UNIQUE NOT NULL,
    libelle VARCHAR(200) NOT NULL,
    description TEXT,
    delai_libelle VARCHAR(120),
    badge_metier VARCHAR(200),
    ordre_affichage INTEGER NOT NULL DEFAULT 0,
    actif BOOLEAN NOT NULL DEFAULT true
);

CREATE INDEX idx_offre_cnps_rubrique ON offre_cnps(rubrique, ordre_affichage);

CREATE TABLE piece_offre_cnps (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    offre_id UUID NOT NULL REFERENCES offre_cnps(id) ON DELETE CASCADE,
    libelle VARCHAR(200) NOT NULL,
    obligatoire BOOLEAN NOT NULL DEFAULT true,
    ordre_affichage INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX idx_piece_offre_cnps_offre ON piece_offre_cnps(offre_id, ordre_affichage);

-- ------------------------------------------------------------------------------------------------
-- Dossier de prestation — distinct de dossier_cnps (immatriculation, adherent_id UNIQUE). Statuts repris
-- des captures (« Incomplet », « Transmis CNPS ») et alignés sur le cycle déjà en place pour dossier_cnps.
-- ------------------------------------------------------------------------------------------------
CREATE TABLE dossier_prestation_cnps (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    adherent_id UUID NOT NULL REFERENCES adherent(id) ON DELETE RESTRICT,
    offre_id UUID NOT NULL REFERENCES offre_cnps(id) ON DELETE RESTRICT,
    statut VARCHAR(20) NOT NULL DEFAULT 'INCOMPLET'
        CHECK (statut IN ('INCOMPLET', 'COMPLET', 'TRANSMIS_CNPS', 'TRAITE', 'REJETE')),
    nombre_personnes_a_charge INTEGER,
    date_depot DATE,
    date_transmission_cnps DATE,
    prochaine_relance_le DATE,
    observations TEXT,
    motif_rejet TEXT,
    cree_le TIMESTAMPTZ NOT NULL DEFAULT now(),
    cree_par VARCHAR(80),
    modifie_le TIMESTAMPTZ,
    modifie_par VARCHAR(80),
    version BIGINT NOT NULL DEFAULT 0
);

CREATE INDEX idx_dossier_prestation_adherent ON dossier_prestation_cnps(adherent_id);
CREATE INDEX idx_dossier_prestation_offre ON dossier_prestation_cnps(offre_id);
CREATE INDEX idx_dossier_prestation_statut ON dossier_prestation_cnps(statut);

CREATE TABLE piece_dossier_prestation_cnps (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    dossier_id UUID NOT NULL REFERENCES dossier_prestation_cnps(id) ON DELETE CASCADE,
    piece_offre_id UUID NOT NULL REFERENCES piece_offre_cnps(id) ON DELETE RESTRICT,
    document_id UUID,
    statut VARCHAR(20) NOT NULL DEFAULT 'ATTENDUE' CHECK (statut IN ('ATTENDUE', 'FOURNIE', 'VALIDEE', 'REJETEE')),
    note TEXT,
    cree_le TIMESTAMPTZ NOT NULL DEFAULT now(),
    cree_par VARCHAR(80)
);

CREATE UNIQUE INDEX idx_piece_dossier_prestation_unique ON piece_dossier_prestation_cnps(dossier_id, piece_offre_id);

-- Historique des transitions de statut — même principe que historique_dossier_cnps (V4) : consultable par
-- le Gestionnaire dans l'application, distinct de journal_audit qui reste réservé à AUDIT:CONSULTER.
CREATE TABLE historique_dossier_prestation_cnps (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    dossier_id UUID NOT NULL REFERENCES dossier_prestation_cnps(id) ON DELETE CASCADE,
    statut_avant VARCHAR(20),
    statut_apres VARCHAR(20) NOT NULL,
    auteur_id UUID REFERENCES utilisateur(id) ON DELETE SET NULL,
    horodatage TIMESTAMPTZ NOT NULL DEFAULT now(),
    commentaire TEXT
);

CREATE INDEX idx_historique_dossier_prestation ON historique_dossier_prestation_cnps(dossier_id, horodatage DESC);

-- ------------------------------------------------------------------------------------------------
-- Seed du référentiel : 4 offres PF + 4 PVID + 4 RP, contenu repris tel quel des documents.
-- ------------------------------------------------------------------------------------------------
INSERT INTO offre_cnps (rubrique, code, libelle, description, delai_libelle, badge_metier, ordre_affichage) VALUES
('PF', 'PF_ALLOCATIONS_FAMILIALES', 'Allocations Familiales — Enfants scolarisés & à charge',
 'Versements périodiques pour l''entretien et l''éducation des enfants à charge légitimes ou reconnus.',
 '15 à 30 jours après dépôt complet', '2 500 à 5 000 FCFA / enfant / mois', 1),
('PF', 'PF_ALLOCATIONS_PRENATALES', 'Allocations Prénatales (Suivi médical obligatoire)',
 'Prime accordée en plusieurs tranches sur présentation des examens médicaux de grossesse.', NULL, NULL, 2),
('PF', 'PF_INDEMNITES_MATERNITE', 'Indemnités Journalières de Maternité (Travailleuses indépendantes)',
 'Compensation de perte de revenu pendant l''arrêt de travail lié à la maternité.', NULL, NULL, 3),
('PF', 'PF_PRIME_NAISSANCE', 'Prime à la Naissance & Frais d''accouchement',
 'Aide financière forfaitaire accordée lors de la naissance d''un enfant viable déclaré à l''état civil.',
 NULL, NULL, 4),

('PVID', 'PVID_PENSION_VIEILLESSE', 'Pension de Vieillesse Normale (Retraite RSTI / CNPS)',
 'Pension viagère trimestrielle servie à l''assuré ayant atteint l''âge légal et cumulé le nombre requis de cotisations.',
 '45 à 60 jours d''instruction', 'Calcul selon les trimestres validés (minimum garanti)', 1),
('PVID', 'PVID_ALLOCATION_UNIQUE', 'Allocation Unique de Vieillesse (Versement forfaitaire)',
 'Remboursement forfaitaire sous forme de capital unique pour l''assuré n''ayant pas atteint le minimum de trimestres cotisés.',
 '30 jours', 'Versement unique des cotisations revalorisées', 2),
('PVID', 'PVID_INVALIDITE_PREMATUREE', 'Pension d''Invalidité Prématurée (Inaptitude médicale)',
 'Pension accordée avant l''âge de la retraite si l''adhérent est frappé d''une inaptitude médicale permanente à l''exercice de son métier.',
 '30 jours après expertise médicale', 'Pension calculée sur la moyenne des cotisations', 3),
('PVID', 'PVID_REVERSION_CAPITAL_DECES', 'Pension de Réversion & Capital Décès (Conjoints et orphelins)',
 'Paiement d''un capital décès d''urgence et service d''une pension aux veufs/veuves et orphelins mineurs de l''adhérent décédé.',
 '20 jours après déclaration du décès', 'Capital décès immédiat + 50% de la pension au conjoint', 4),

('RP', 'RP_ACCIDENT_TRAVAIL', 'Accident du Travail & Trajet (Déclaration et prise en charge)',
 'Prise en charge d''urgence de tout accident survenu sur le lieu d''activité ou sur le trajet direct.',
 'Déclaration sous 48h obligatoire', 'Prise en charge médicale à 100%', 1),
('RP', 'RP_MALADIE_PROFESSIONNELLE', 'Maladie Professionnelle (Reconnaissance et soins)',
 'Affection liée aux conditions de travail.',
 '30 jours après expertise médicale', 'Prise en charge intégrale des soins et bilans', 2),
('RP', 'RP_SOINS_MEDICAUX', 'Prise en Charge des Soins Médicaux, Pharmaceutiques & Prothèses',
 'Remboursement ou prise en charge directe des médicaments, appareillages, rééducation motrice.',
 '14 jours après validation des ordonnances', 'Remboursement sur justificatifs validés', 3),
('RP', 'RP_RENTE_INCAPACITE', 'Rente d''Incapacité Permanente ou de Survivants',
 'Rente viagère ou capital forfaitaire versé en cas de réduction définitive de la capacité de travail ou décès.',
 'Commission médicale CNPS', 'Pourcentage fixé par le barème d''invalidité', 4);

-- Pièces obligatoires par offre (contenu repris tel quel des documents).
INSERT INTO piece_offre_cnps (offre_id, libelle, obligatoire, ordre_affichage) VALUES
((SELECT id FROM offre_cnps WHERE code = 'PF_ALLOCATIONS_FAMILIALES'), 'Extrait de naissance de l''adhérent', true, 1),
((SELECT id FROM offre_cnps WHERE code = 'PF_ALLOCATIONS_FAMILIALES'), 'Photocopie de la CNI de l''adhérent', true, 2),
((SELECT id FROM offre_cnps WHERE code = 'PF_ALLOCATIONS_FAMILIALES'), 'Attestation d''immatriculation CNPS', true, 3),
((SELECT id FROM offre_cnps WHERE code = 'PF_ALLOCATIONS_FAMILIALES'), 'Extraits d''acte de naissance des enfants à charge', true, 4),
((SELECT id FROM offre_cnps WHERE code = 'PF_ALLOCATIONS_FAMILIALES'), 'Certificats de scolarité ou d''apprentissage en cours de validité', true, 5),
((SELECT id FROM offre_cnps WHERE code = 'PF_ALLOCATIONS_FAMILIALES'), 'Certificat de vie et d''entretien collectif', true, 6),
((SELECT id FROM offre_cnps WHERE code = 'PF_ALLOCATIONS_FAMILIALES'), 'Certificat de mariage légal si applicable', false, 7),
((SELECT id FROM offre_cnps WHERE code = 'PF_ALLOCATIONS_FAMILIALES'), 'Photos d''identité récentes de l''assuré', true, 8),

((SELECT id FROM offre_cnps WHERE code = 'PF_ALLOCATIONS_PRENATALES'), 'Carnet de consultations prénatales homologué', true, 1),
((SELECT id FROM offre_cnps WHERE code = 'PF_ALLOCATIONS_PRENATALES'), 'Certificats des visites médicales obligatoires', true, 2),
((SELECT id FROM offre_cnps WHERE code = 'PF_ALLOCATIONS_PRENATALES'), 'Carte d''assuré CNPS valide', true, 3),

((SELECT id FROM offre_cnps WHERE code = 'PF_INDEMNITES_MATERNITE'), 'Attestation d''immatriculation CNPS à jour', true, 1),
((SELECT id FROM offre_cnps WHERE code = 'PF_INDEMNITES_MATERNITE'), 'Certificat médical de grossesse', true, 2),
((SELECT id FROM offre_cnps WHERE code = 'PF_INDEMNITES_MATERNITE'), 'Déclaration formelle d''interruption d''activité', true, 3),
((SELECT id FROM offre_cnps WHERE code = 'PF_INDEMNITES_MATERNITE'), 'RIB ou coordonnées Mobile Money pour paiement', true, 4),
((SELECT id FROM offre_cnps WHERE code = 'PF_INDEMNITES_MATERNITE'), 'Certificat d''accouchement', true, 5),

((SELECT id FROM offre_cnps WHERE code = 'PF_PRIME_NAISSANCE'), 'Extrait d''acte de naissance du nouveau-né', true, 1),
((SELECT id FROM offre_cnps WHERE code = 'PF_PRIME_NAISSANCE'), 'Certificat médical d''accouchement', true, 2),
((SELECT id FROM offre_cnps WHERE code = 'PF_PRIME_NAISSANCE'), 'Copie de la CNI de la mère et du père adhérent', true, 3),

((SELECT id FROM offre_cnps WHERE code = 'PVID_PENSION_VIEILLESSE'), 'Demande officielle de liquidation de pension de vieillesse', true, 1),
((SELECT id FROM offre_cnps WHERE code = 'PVID_PENSION_VIEILLESSE'), 'Extrait d''acte de naissance de l''assuré — 3 mois', true, 2),
((SELECT id FROM offre_cnps WHERE code = 'PVID_PENSION_VIEILLESSE'), 'Photocopie CNI ou passeport légalisé', true, 3),
((SELECT id FROM offre_cnps WHERE code = 'PVID_PENSION_VIEILLESSE'), 'Relevé de carrière individuel et bordereaux de cotisations COSITI/CNPS', true, 4),
((SELECT id FROM offre_cnps WHERE code = 'PVID_PENSION_VIEILLESSE'), 'Attestation de cessation ou d''aménagement d''activité', true, 5),
((SELECT id FROM offre_cnps WHERE code = 'PVID_PENSION_VIEILLESSE'), 'RIB bancaire ou compte Mobile Money pour paiement des arrérages', true, 6),
((SELECT id FROM offre_cnps WHERE code = 'PVID_PENSION_VIEILLESSE'), '3 photos d''identité récentes de l''assuré', true, 7),

((SELECT id FROM offre_cnps WHERE code = 'PVID_ALLOCATION_UNIQUE'), 'Demande formelle d''allocation unique de vieillesse', true, 1),
((SELECT id FROM offre_cnps WHERE code = 'PVID_ALLOCATION_UNIQUE'), 'Extrait d''acte de naissance et pièce d''identité', true, 2),
((SELECT id FROM offre_cnps WHERE code = 'PVID_ALLOCATION_UNIQUE'), 'Historique des cotisations COSITI certifié', true, 3),
((SELECT id FROM offre_cnps WHERE code = 'PVID_ALLOCATION_UNIQUE'), 'RIB bancaire ou compte Mobile Money certifié', true, 4),

((SELECT id FROM offre_cnps WHERE code = 'PVID_INVALIDITE_PREMATUREE'), 'Rapport médical circonstancié du médecin traitant sous pli confidentiel', true, 1),
((SELECT id FROM offre_cnps WHERE code = 'PVID_INVALIDITE_PREMATUREE'), 'Avis conforme du médecin conseil de la CNPS', true, 2),
((SELECT id FROM offre_cnps WHERE code = 'PVID_INVALIDITE_PREMATUREE'), 'Relevé récapitulatif des cotisations COSITI à jour', true, 3),
((SELECT id FROM offre_cnps WHERE code = 'PVID_INVALIDITE_PREMATUREE'), 'Extrait d''acte de naissance et pièce d''identité', true, 4),

((SELECT id FROM offre_cnps WHERE code = 'PVID_REVERSION_CAPITAL_DECES'), 'Extrait d''acte de décès de l''adhérent assuré', true, 1),
((SELECT id FROM offre_cnps WHERE code = 'PVID_REVERSION_CAPITAL_DECES'), 'Certificat de mariage légal délivré par le tribunal', false, 2),
((SELECT id FROM offre_cnps WHERE code = 'PVID_REVERSION_CAPITAL_DECES'), 'Acte de mariage religieux du conjoint survivant', false, 3),
((SELECT id FROM offre_cnps WHERE code = 'PVID_REVERSION_CAPITAL_DECES'), 'Extraits d''actes de naissance de tous les orphelins mineurs', false, 4),
((SELECT id FROM offre_cnps WHERE code = 'PVID_REVERSION_CAPITAL_DECES'), 'Certificats de scolarité des orphelins scolarisés', false, 5),
((SELECT id FROM offre_cnps WHERE code = 'PVID_REVERSION_CAPITAL_DECES'), 'Relevé d''identité bancaire du conjoint tuteur', true, 6),

((SELECT id FROM offre_cnps WHERE code = 'RP_ACCIDENT_TRAVAIL'), 'Formulaire officiel déclaration d''accident du travail (DAT)', true, 1),
((SELECT id FROM offre_cnps WHERE code = 'RP_ACCIDENT_TRAVAIL'), 'Certificat médical initial constatant les lésions', true, 2),
((SELECT id FROM offre_cnps WHERE code = 'RP_ACCIDENT_TRAVAIL'), 'Rapport d''enquête ou témoignages des circonstances (COSITI)', true, 3),
((SELECT id FROM offre_cnps WHERE code = 'RP_ACCIDENT_TRAVAIL'), 'Reçus et factures détaillées des soins d''urgence', true, 4),
((SELECT id FROM offre_cnps WHERE code = 'RP_ACCIDENT_TRAVAIL'), 'Carte d''immatriculation CNPS de l''adhérent', true, 5),

((SELECT id FROM offre_cnps WHERE code = 'RP_MALADIE_PROFESSIONNELLE'), 'Déclaration maladie professionnelle', true, 1),
((SELECT id FROM offre_cnps WHERE code = 'RP_MALADIE_PROFESSIONNELLE'), 'Rapport d''exposition au risque dans l''activité habituelle', true, 2),
((SELECT id FROM offre_cnps WHERE code = 'RP_MALADIE_PROFESSIONNELLE'), 'Examens biologiques ou radiologiques de confirmation', true, 3),
((SELECT id FROM offre_cnps WHERE code = 'RP_MALADIE_PROFESSIONNELLE'), 'Historique des cotisations COSITI à jour', true, 4),

((SELECT id FROM offre_cnps WHERE code = 'RP_SOINS_MEDICAUX'), 'Prescriptions et ordonnances médicales originales', true, 1),
((SELECT id FROM offre_cnps WHERE code = 'RP_SOINS_MEDICAUX'), 'Factures normalisées certifiées acquittées', true, 2),
((SELECT id FROM offre_cnps WHERE code = 'RP_SOINS_MEDICAUX'), 'Rapport du médecin traitant ou spécialiste', true, 3),

((SELECT id FROM offre_cnps WHERE code = 'RP_RENTE_INCAPACITE'), 'Certificat médical de consolidation ou guérison avec séquelles', true, 1),
((SELECT id FROM offre_cnps WHERE code = 'RP_RENTE_INCAPACITE'), 'Décision du médecin conseil de la CNPS fixant le taux d''IPP', true, 2),
((SELECT id FROM offre_cnps WHERE code = 'RP_RENTE_INCAPACITE'), 'Acte de décès et certificat d''hérédité si rente de survivants', false, 3),
((SELECT id FROM offre_cnps WHERE code = 'RP_RENTE_INCAPACITE'), 'Dossier administratif complet COSITI', true, 4);
