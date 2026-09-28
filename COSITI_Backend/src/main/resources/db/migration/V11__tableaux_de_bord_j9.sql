-- V11__tableaux_de_bord_j9.sql
-- Jalon J9 — Tableaux de bord par rôle.
--
-- SIX dashboards exclusivement (Roles des acteurs.md §2 et §11) : PCA, DG, DGA, DAF, Gestionnaire des
-- comptes, Super Administrateur. Le Chef des agents de terrain et l'Agent de terrain n'en ont PAS
-- (Roles des acteurs.md §16, hors périmètre V1) — ne jamais en ajouter un.
--
-- Une permission par dashboard, accordée au seul rôle concerné. C'est ce qui rend les cas de recette
-- REC-H08 (« Agent ouvre une route dashboard DGA -> accès refusé ») et REC-H09 vérifiables par un test,
-- plutôt qu'un contrôle par rôle dispersé dans le code.

INSERT INTO permission (code, module, libelle) VALUES
    ('TABLEAU_BORD:PCA', 'TABLEAU_BORD', 'Consulter le tableau de bord du PCA'),
    ('TABLEAU_BORD:DG', 'TABLEAU_BORD', 'Consulter le tableau de bord du Directeur général'),
    ('TABLEAU_BORD:DGA', 'TABLEAU_BORD', 'Consulter le tableau de bord du Directeur général adjoint'),
    ('TABLEAU_BORD:DAF', 'TABLEAU_BORD', 'Consulter le tableau de bord du Directeur administratif et financier'),
    ('TABLEAU_BORD:GESTIONNAIRE', 'TABLEAU_BORD', 'Consulter le tableau de bord du Gestionnaire des comptes'),
    ('TABLEAU_BORD:SUPER_ADMIN', 'TABLEAU_BORD', 'Consulter le tableau de bord du Super Administrateur')
ON CONFLICT (code) DO NOTHING;

-- Chaque permission va exactement à son rôle. Aucun cumul, y compris pour le Super Administrateur :
-- il administre le système, il n'a pas d'accès métier courant (Roles des acteurs.md §10).
INSERT INTO role_permission (role_id, permission_id)
SELECT r.id, p.id FROM role r, permission p
WHERE (r.code = 'PCA' AND p.code = 'TABLEAU_BORD:PCA')
   OR (r.code = 'DG' AND p.code = 'TABLEAU_BORD:DG')
   OR (r.code = 'DGA' AND p.code = 'TABLEAU_BORD:DGA')
   OR (r.code = 'DAF' AND p.code = 'TABLEAU_BORD:DAF')
   OR (r.code = 'GESTIONNAIRE_COMPTE' AND p.code = 'TABLEAU_BORD:GESTIONNAIRE')
   OR (r.code = 'SUPER_ADMIN' AND p.code = 'TABLEAU_BORD:SUPER_ADMIN')
ON CONFLICT DO NOTHING;

-- ------------------------------------------------------------------
-- Vue matérialisée de synthèse par zone
-- ------------------------------------------------------------------
-- `vue_situation_adherent` (V4) porte la situation ligne à ligne. Les dashboards ont besoin d'agrégats par
-- zone : les calculer à la volée sur l'ensemble des paiements est explicitement écarté par
-- docs/02_CLASSES_ET_METHODES.md §8 (« calculé sur les vues matérialisées, jamais par agrégation à la volée »).
--
-- `nb_actifs` compte les adhérents ayant cotisé au moins une fois : c'est le numérateur du taux
-- d'activation, l'indicateur central du projet (115 des 172 adhérents n'ont jamais cotisé).

CREATE MATERIALIZED VIEW IF NOT EXISTS vue_synthese_zone AS
SELECT
    z.id AS zone_id,
    z.code AS zone_code,
    z.libelle AS zone_libelle,
    COUNT(a.id) AS nb_adherents,
    COUNT(a.id) FILTER (WHERE COALESCE(v.cumul_cotise, 0) > 0) AS nb_actifs,
    COUNT(a.id) FILTER (WHERE a.statut = 'EN_RETARD') AS nb_en_retard,
    COALESCE(SUM(v.cumul_cotise), 0) AS cumul_collecte,
    COUNT(DISTINCT ag.id) AS nb_agents
FROM zone z
LEFT JOIN adherent a ON a.zone_id = z.id AND a.archive = false
LEFT JOIN vue_situation_adherent v ON v.adherent_id = a.id
LEFT JOIN agent ag ON ag.zone_id = z.id AND ag.archive = false AND ag.actif = true
GROUP BY z.id, z.code, z.libelle;

CREATE UNIQUE INDEX idx_vue_synthese_zone_id ON vue_synthese_zone(zone_id);
