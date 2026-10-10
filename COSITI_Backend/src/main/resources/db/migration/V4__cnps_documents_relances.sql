-- V4__cnps_documents_relances.sql
-- Module CNPS, gestion documentaire chiffrée, campagnes de relance, notifications et vues matérialisées

-- 1. Table des documents
CREATE TABLE document (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    type_document VARCHAR(40) NOT NULL, -- CNI, ACTE_NAISSANCE, PREUVE_PAIEMENT, ACCUSE_CNPS, AUTRE
    nom_fichier_original VARCHAR(255) NOT NULL,
    chemin_stockage VARCHAR(500) UNIQUE NOT NULL,
    type_mime VARCHAR(100) NOT NULL,
    taille_octets BIGINT NOT NULL CHECK (taille_octets > 0),
    empreinte_sha256 CHAR(64) NOT NULL,
    chiffre BOOLEAN NOT NULL DEFAULT true,
    adherent_id UUID REFERENCES adherent(id) ON DELETE CASCADE,
    paiement_id UUID REFERENCES paiement(id) ON DELETE SET NULL,
    statut VARCHAR(20) NOT NULL DEFAULT 'AJOUTE', -- AJOUTE, VERIFIE, REJETE, ARCHIVE
    analyse_antivirus VARCHAR(20) NOT NULL DEFAULT 'EN_ATTENTE', -- EN_ATTENTE, PROPRE, INFECTE
    cree_le TIMESTAMPTZ NOT NULL DEFAULT now(),
    cree_par VARCHAR(80),
    archive BOOLEAN NOT NULL DEFAULT false,
    motif_archivage TEXT
);

CREATE INDEX idx_document_adherent ON document(adherent_id);
CREATE INDEX idx_document_sha256 ON document(empreinte_sha256);

-- 2. Module CNPS : Dossier, Pièces et Déclarations
CREATE TABLE dossier_cnps (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    adherent_id UUID UNIQUE NOT NULL REFERENCES adherent(id) ON DELETE CASCADE,
    numero_immatriculation VARCHAR(30) UNIQUE,
    date_immatriculation DATE,
    revenu_mensuel_declare NUMERIC(14,2), -- [V - assiette de calcul en attente]
    statut VARCHAR(20) NOT NULL DEFAULT 'BROUILLON', -- BROUILLON, INCOMPLET, PRET, TRANSMIS, TRAITE, REJETE
    motif_rejet TEXT,
    cree_le TIMESTAMPTZ NOT NULL DEFAULT now(),
    cree_par VARCHAR(80),
    modifie_le TIMESTAMPTZ,
    modifie_par VARCHAR(80),
    version BIGINT NOT NULL DEFAULT 0
);

CREATE TABLE piece_dossier_cnps (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    dossier_id UUID NOT NULL REFERENCES dossier_cnps(id) ON DELETE CASCADE,
    type_piece VARCHAR(60) NOT NULL, -- CNI_RECTO, CNI_VERSO, ACTE_NAISSANCE, PHOTO_IDENTITE, FORMULAIRE_SIGNE
    document_id UUID REFERENCES document(id) ON DELETE SET NULL,
    statut VARCHAR(20) NOT NULL DEFAULT 'ATTENDUE', -- ATTENDUE, FOURNIE, VALIDEE, REJETEE
    obligatoire BOOLEAN NOT NULL DEFAULT true,
    cree_le TIMESTAMPTZ NOT NULL DEFAULT now(),
    cree_par VARCHAR(80)
);

CREATE TABLE declaration_cnps (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    dossier_id UUID NOT NULL REFERENCES dossier_cnps(id) ON DELETE CASCADE,
    periode_mois DATE NOT NULL, -- Premier jour du mois civil
    montant_declare NUMERIC(14,2) NOT NULL CHECK (montant_declare >= 0),
    statut VARCHAR(20) NOT NULL DEFAULT 'A_PRODUIRE', -- A_PRODUIRE, TRANSMISE, ACCUSEE, REJETEE
    date_transmission DATE,
    accuse_document_id UUID REFERENCES document(id) ON DELETE SET NULL,
    cree_le TIMESTAMPTZ NOT NULL DEFAULT now(),
    cree_par VARCHAR(80),
    CONSTRAINT uq_declaration_mois UNIQUE (dossier_id, periode_mois)
);

CREATE TABLE historique_dossier_cnps (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    dossier_id UUID NOT NULL REFERENCES dossier_cnps(id) ON DELETE CASCADE,
    statut_avant VARCHAR(20),
    statut_apres VARCHAR(20) NOT NULL,
    auteur_id UUID REFERENCES utilisateur(id) ON DELETE SET NULL,
    horodatage TIMESTAMPTZ NOT NULL DEFAULT now(),
    commentaire TEXT
);

-- 3. Module Relances et Notifications
CREATE TABLE campagne_relance (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    libelle VARCHAR(160) NOT NULL,
    critere JSONB NOT NULL,
    date_debut DATE NOT NULL,
    date_fin DATE,
    statut VARCHAR(20) NOT NULL DEFAULT 'ACTIVE', -- ACTIVE, CLOTUREE, SUSPENDUE
    cree_le TIMESTAMPTZ NOT NULL DEFAULT now(),
    cree_par VARCHAR(80)
);

CREATE TABLE relance (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    adherent_id UUID NOT NULL REFERENCES adherent(id) ON DELETE CASCADE,
    campagne_id UUID REFERENCES campagne_relance(id) ON DELETE SET NULL,
    responsable_utilisateur_id UUID REFERENCES utilisateur(id) ON DELETE SET NULL,
    canal VARCHAR(20) NOT NULL CHECK (canal IN ('APPEL', 'SMS', 'WHATSAPP', 'VISITE')),
    date_contact TIMESTAMPTZ NOT NULL DEFAULT now(),
    resultat VARCHAR(30) NOT NULL CHECK (resultat IN ('PROMESSE', 'PAIEMENT', 'INJOIGNABLE', 'REFUS', 'DEMENAGE', 'ABSENT')),
    prochaine_action_le DATE,
    commentaire TEXT,
    cree_le TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE notification (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    destinataire_utilisateur_id UUID NOT NULL REFERENCES utilisateur(id) ON DELETE CASCADE,
    type VARCHAR(40) NOT NULL,
    titre VARCHAR(160) NOT NULL,
    corps TEXT NOT NULL,
    entite VARCHAR(40),
    entite_id UUID,
    lue BOOLEAN NOT NULL DEFAULT false,
    cree_le TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 4. Table technique de reprise de données historiques
CREATE TABLE migration_correspondance (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    source VARCHAR(60) NOT NULL,
    cle_source VARCHAR(200) NOT NULL,
    entite_cible VARCHAR(40) NOT NULL,
    id_cible UUID NOT NULL,
    action VARCHAR(20) NOT NULL, -- IMPORTE, FUSIONNE, ECARTE
    commentaire TEXT,
    cree_le TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 5. Vues Matérialisées de Synthèse pour les Tableaux de Bord
CREATE MATERIALIZED VIEW IF NOT EXISTS vue_situation_adherent AS
SELECT 
    a.id AS adherent_id,
    a.matricule,
    a.nom,
    a.prenoms,
    p.code AS pack_code,
    a.statut AS statut_adherent,
    COALESCE(SUM(c.montant), 0) AS cumul_cotise,
    MAX(pd.date_fin) AS dernier_droit_fin,
    CURRENT_DATE - COALESCE(MAX(pd.date_fin), a.date_adhesion) AS jours_retard_estimes,
    ag.code_agent,
    ag.nom_complet AS agent_nom,
    z.libelle AS zone_nom
FROM adherent a
JOIN activite act ON a.activite_id = act.id
JOIN zone z ON a.zone_id = z.id
LEFT JOIN adhesion adh ON adh.adherent_id = a.id AND adh.date_fin IS NULL
LEFT JOIN pack p ON adh.pack_id = p.id
LEFT JOIN affectation_portefeuille ap ON ap.adherent_id = a.id AND ap.date_fin IS NULL
LEFT JOIN agent ag ON ap.agent_id = ag.id
LEFT JOIN paiement c ON c.adherent_id = a.id AND c.statut = 'VALIDE'
LEFT JOIN periode_droits pd ON pd.adherent_id = a.id AND pd.statut = 'COUVERTE'
WHERE a.archive = false
GROUP BY a.id, a.matricule, a.nom, a.prenoms, p.code, a.statut, ag.code_agent, ag.nom_complet, z.libelle;

CREATE UNIQUE INDEX idx_vue_sit_adh_id ON vue_situation_adherent(adherent_id);
