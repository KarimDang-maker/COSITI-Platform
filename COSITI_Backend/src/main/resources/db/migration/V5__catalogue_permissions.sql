-- V5__catalogue_permissions.sql
-- Catalogue de permissions RBAC (jalon J1) et attribution aux 8 rôles V1.
-- Format des codes : MODULE:ACTION (docs/01_SCHEMA_BDD.md §1, docs/03_SPECIFICATIONS_API.md).
-- Couvre au minimum les jalons J1 à J4. Les modules non encore implémentés (CNPS, relances, comptes rendus,
-- rapport DAF, exports, administration détaillée) auront leur propre lot de permissions lors de leur jalon,
-- sans modifier cette migration (règle absolue : les migrations Flyway existantes ne sont jamais modifiées).

INSERT INTO permission (code, module, libelle) VALUES
    -- Adhérents (J2)
    ('ADHERENT:LIRE', 'ADHERENT', 'Consulter la fiche et la liste des adhérents'),
    ('ADHERENT:CREER', 'ADHERENT', 'Créer un adhérent (inclut la vérification de doublon)'),
    ('ADHERENT:MODIFIER', 'ADHERENT', 'Modifier la fiche d''un adhérent, y compris le changement de pack'),
    ('ADHERENT:ARCHIVER', 'ADHERENT', 'Archiver logiquement un adhérent'),
    ('ADHERENT:CHANGER_STATUT', 'ADHERENT', 'Changer le statut de régularité d''un adhérent'),

    -- Organisation terrain (J3)
    ('ORGANISATION:LIRE', 'ORGANISATION', 'Consulter zones, agents et portefeuilles'),
    ('ORGANISATION:GERER', 'ORGANISATION', 'Créer/modifier zones et agents (dont ajout d''un Agent par la DGA)'),
    ('ORGANISATION:AFFECTER_PORTEFEUILLE', 'ORGANISATION', 'Affecter ou transférer un portefeuille d''adhérents'),
    ('ORGANISATION:DESIGNER_CHEF', 'ORGANISATION', 'Désigner ou remplacer le Chef des agents de terrain (réservé DGA)'),

    -- Cotisations (J4)
    ('PAIEMENT:LIRE', 'PAIEMENT', 'Consulter le journal des paiements et les reçus'),
    ('PAIEMENT:CREER', 'PAIEMENT', 'Enregistrer un paiement'),
    ('PAIEMENT:VALIDER', 'PAIEMENT', 'Valider un paiement (jamais son propre paiement saisi)'),
    ('PAIEMENT:CORRIGER', 'PAIEMENT', 'Corriger un paiement existant, motif obligatoire'),
    ('PAIEMENT:ANNULER', 'PAIEMENT', 'Annuler un paiement, motif obligatoire'),
    ('PAIEMENT:AFFECTER', 'PAIEMENT', 'Affecter manuellement un paiement à ses composantes'),
    ('PAIEMENT:RAPPROCHER', 'PAIEMENT', 'Rapprocher un paiement (P1)'),

    -- Transverse
    ('AUDIT:CONSULTER', 'AUDIT', 'Consulter le journal d''audit (lecture seule, aucune purge exposée)'),
    ('ADMINISTRATION:GERER', 'ADMINISTRATION', 'Administrer utilisateurs, rôles et paramètres')
ON CONFLICT (code) DO NOTHING;

-- Attribution des permissions aux rôles (docs/01_SCHEMA_BDD.md §1 + Roles des acteurs.md §11 « Matrice synthétique »).
-- PCA, DG : lecture globale (consultation) sur adhérents/paiements/organisation + audit.
INSERT INTO role_permission (role_id, permission_id)
SELECT r.id, p.id FROM role r, permission p
WHERE r.code IN ('PCA', 'DG')
  AND p.code IN ('ADHERENT:LIRE', 'PAIEMENT:LIRE', 'ORGANISATION:LIRE', 'AUDIT:CONSULTER')
ON CONFLICT DO NOTHING;

-- DGA : supervision opérationnelle, organisation terrain, désignation du Chef.
INSERT INTO role_permission (role_id, permission_id)
SELECT r.id, p.id FROM role r, permission p
WHERE r.code = 'DGA'
  AND p.code IN ('ADHERENT:LIRE', 'PAIEMENT:LIRE', 'ORGANISATION:LIRE', 'ORGANISATION:GERER',
                 'ORGANISATION:AFFECTER_PORTEFEUILLE', 'ORGANISATION:DESIGNER_CHEF', 'AUDIT:CONSULTER')
ON CONFLICT DO NOTHING;

-- DAF : contrôle financier (validation, correction, annulation, rapprochement).
INSERT INTO role_permission (role_id, permission_id)
SELECT r.id, p.id FROM role r, permission p
WHERE r.code = 'DAF'
  AND p.code IN ('ADHERENT:LIRE', 'PAIEMENT:LIRE', 'PAIEMENT:VALIDER', 'PAIEMENT:CORRIGER',
                 'PAIEMENT:ANNULER', 'PAIEMENT:AFFECTER', 'PAIEMENT:RAPPROCHER', 'ORGANISATION:LIRE', 'AUDIT:CONSULTER')
ON CONFLICT DO NOTHING;

-- Gestionnaire des comptes : gestion des adhérents et suivi des paiements (pas de validation financière).
INSERT INTO role_permission (role_id, permission_id)
SELECT r.id, p.id FROM role r, permission p
WHERE r.code = 'GESTIONNAIRE_COMPTE'
  AND p.code IN ('ADHERENT:LIRE', 'ADHERENT:CREER', 'ADHERENT:MODIFIER', 'ADHERENT:ARCHIVER',
                 'ADHERENT:CHANGER_STATUT', 'PAIEMENT:LIRE', 'ORGANISATION:LIRE', 'AUDIT:CONSULTER')
ON CONFLICT DO NOTHING;

-- Agent de terrain : saisie (adhérents, paiements), lecture de son propre périmètre (filtré par ServicePerimetreDonnees).
INSERT INTO role_permission (role_id, permission_id)
SELECT r.id, p.id FROM role r, permission p
WHERE r.code = 'AGENT_TERRAIN'
  AND p.code IN ('ADHERENT:LIRE', 'ADHERENT:CREER', 'ADHERENT:MODIFIER', 'PAIEMENT:CREER', 'PAIEMENT:LIRE',
                 'ORGANISATION:LIRE')
ON CONFLICT DO NOTHING;

-- Chef des agents de terrain : rôle additionnel superposé à AGENT_TERRAIN (docs/01_SCHEMA_BDD.md §1) —
-- un utilisateur désigné Chef porte les deux rôles, il cumule donc leurs permissions.
INSERT INTO role_permission (role_id, permission_id)
SELECT r.id, p.id FROM role r, permission p
WHERE r.code = 'CHEF_AGENT_TERRAIN'
  AND p.code IN ('ADHERENT:LIRE', 'PAIEMENT:LIRE', 'ORGANISATION:LIRE')
ON CONFLICT DO NOTHING;

-- Super Administrateur : administration technique, pas d'accès métier courant (docs/02 §2, docs/04_SECURITE.md §3).
INSERT INTO role_permission (role_id, permission_id)
SELECT r.id, p.id FROM role r, permission p
WHERE r.code = 'SUPER_ADMIN'
  AND p.code IN ('ADMINISTRATION:GERER', 'AUDIT:CONSULTER')
ON CONFLICT DO NOTHING;
