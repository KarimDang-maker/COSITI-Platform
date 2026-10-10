-- V25 — Checklist d'archivage du dossier d'immatriculation CNPS.
--
-- Pas de nouveau stockage de fichiers : chaque ligne rattache une pièce attendue à un `document` existant
-- (déjà chiffré, empreinté et antivirus-contrôlé, V4) et/ou à une référence physique (classeur, casier).
-- Aucune suppression : un changement de statut ou de rattachement est historisé.

CREATE TABLE checklist_archivage_dossier (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    dossier_id UUID NOT NULL REFERENCES dossier_cnps(id) ON DELETE RESTRICT,
    code_piece VARCHAR(40) NOT NULL,
    statut VARCHAR(20) NOT NULL DEFAULT 'NON_FOURNIE'
        CHECK (statut IN ('NON_FOURNIE', 'FOURNIE', 'VERIFIEE', 'ARCHIVEE')),
    document_id UUID REFERENCES document(id) ON DELETE SET NULL,
    reference_physique VARCHAR(200),
    motif TEXT,
    cree_le TIMESTAMPTZ NOT NULL DEFAULT now(),
    cree_par VARCHAR(80),
    modifie_le TIMESTAMPTZ,
    modifie_par VARCHAR(80),
    UNIQUE (dossier_id, code_piece)
);

CREATE TABLE historique_checklist_archivage (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    checklist_id UUID NOT NULL REFERENCES checklist_archivage_dossier(id) ON DELETE RESTRICT,
    statut_avant VARCHAR(20),
    statut_apres VARCHAR(20) NOT NULL,
    document_id UUID,
    reference_physique VARCHAR(200),
    motif TEXT,
    auteur_id UUID REFERENCES utilisateur(id) ON DELETE SET NULL,
    horodatage TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_checklist_archivage_dossier ON checklist_archivage_dossier(dossier_id);
CREATE INDEX idx_historique_checklist ON historique_checklist_archivage(checklist_id, horodatage DESC);

INSERT INTO parametre (cle, valeur, type_valeur, libelle, modifiable_par_role, statut_validation) VALUES
    ('ARCHIVAGE_PIECES',
     'CNI_RECTO,CNI_VERSO,ACTE_NAISSANCE,PHOTO_IDENTITE,FORMULAIRE_SIGNE,RECEPISSE_PREIMMAT,ACCUSE_DEPOT_CPS,ATTESTATION_IMMAT',
     'TEXTE', 'Pièces suivies dans la checklist d''archivage du dossier d''immatriculation (ordre d''affichage)',
     'SUPER_ADMIN', 'A'),
    ('ARCHIVAGE_PIECES_BLOQUANTES',
     'CNI_RECTO,CNI_VERSO,ACTE_NAISSANCE,PHOTO_IDENTITE,FORMULAIRE_SIGNE,RECEPISSE_PREIMMAT,ACCUSE_DEPOT_CPS',
     'TEXTE', 'Pièces qui doivent être vérifiées ou archivées avant l''immatriculation définitive',
     'SUPER_ADMIN', 'A')
ON CONFLICT (cle) DO NOTHING;
