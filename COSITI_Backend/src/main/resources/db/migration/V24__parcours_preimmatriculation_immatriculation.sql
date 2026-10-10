-- V24 — Parcours CNPS : préimmatriculation (vague mensuelle) puis immatriculation définitive.
--
-- Règles COSITI (note du jour) : préimmatriculation avant le 15 de chaque mois, quota de 10 500 FCFA cumulés ;
-- non atteint → reconduit sur la seconde quinzaine, puis sur la vague du mois suivant ; immatriculation au quota
-- de 21 000 FCFA ; 30 jours pour déposer le dossier physique après la préimmatriculation. Tous ces chiffres sont
-- modifiables par le DAF : ils vivent dans `parametre`, jamais en constante Java (AGENTS.md règle n°1).
--
-- Le cumul d'un adhérent n'est PAS stocké : il se calcule en direct depuis `periode_droits` (cotisations validées),
-- ce qui garantit que la gestionnaire voit un adhérent « en règle » dès la validation du DAF.

CREATE TABLE parcours_cnps (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    adherent_id UUID NOT NULL UNIQUE REFERENCES adherent(id) ON DELETE RESTRICT,
    statut_parcours VARCHAR(30) NOT NULL DEFAULT 'EN_ATTENTE'
        CHECK (statut_parcours IN ('EN_ATTENTE', 'PREIMMATRICULE', 'DOSSIER_DEPOSE', 'IMMATRICULE')),
    -- Premier jour du mois de la vague courante ; avance d'un mois à chaque report.
    vague_mois DATE NOT NULL DEFAULT date_trunc('month', now())::date,
    nb_reports INTEGER NOT NULL DEFAULT 0 CHECK (nb_reports >= 0),
    date_preimmatriculation DATE,
    numero_temporaire VARCHAR(40),
    recepisse_document_id UUID REFERENCES document(id) ON DELETE SET NULL,
    date_limite_depot DATE,
    date_depot_cps DATE,
    depot_hors_delai BOOLEAN NOT NULL DEFAULT false,
    cps VARCHAR(120),
    date_immatriculation DATE,
    cree_le TIMESTAMPTZ NOT NULL DEFAULT now(),
    cree_par VARCHAR(80),
    modifie_le TIMESTAMPTZ,
    modifie_par VARCHAR(80),
    version BIGINT NOT NULL DEFAULT 0
);

CREATE INDEX idx_parcours_cnps_statut ON parcours_cnps(statut_parcours, vague_mois);
CREATE INDEX idx_parcours_cnps_limite ON parcours_cnps(date_limite_depot) WHERE statut_parcours = 'PREIMMATRICULE';

INSERT INTO parametre (cle, valeur, type_valeur, libelle, modifiable_par_role, statut_validation) VALUES
    ('PREIMMAT_QUOTA', '10500', 'DECIMAL',
     'Cumul de cotisations validées (FCFA) pour être préimmatriculé', 'DAF', 'C'),
    ('IMMAT_QUOTA', '21000', 'DECIMAL',
     'Cumul de cotisations validées (FCFA) pour l''immatriculation définitive', 'DAF', 'C'),
    ('PREIMMAT_JOUR_COUPURE', '15', 'ENTIER',
     'Jour du mois qui sépare la première fenêtre de préimmatriculation de la seconde (1 à 28)', 'DAF', 'C'),
    ('PREIMMAT_DELAI_DEPOT_JOURS', '30', 'ENTIER',
     'Délai (jours) pour déposer le dossier physique au CPS après la préimmatriculation', 'DAF', 'C'),
    ('PREIMMAT_ALERTES_JOURS', '7,3,1', 'TEXTE',
     'Nombre de jours avant l''échéance de dépôt auxquels une alerte est envoyée (liste séparée par des virgules)',
     'DAF', 'C')
ON CONFLICT (cle) DO NOTHING;

INSERT INTO permission (code, module, libelle) VALUES
    ('CNPS:PARAMETRER', 'CNPS', 'Modifier les quotas, le jour de coupure et le délai de dépôt de la préimmatriculation')
ON CONFLICT (code) DO NOTHING;

INSERT INTO role_permission (role_id, permission_id)
SELECT r.id, p.id FROM role r, permission p
WHERE r.code IN ('DAF', 'SUPER_ADMIN') AND p.code = 'CNPS:PARAMETRER'
ON CONFLICT DO NOTHING;
