-- V13__administration_securite_j11.sql
-- Jalon J11 — Administration et durcissement de la sécurité.
--
-- La permission `ADMINISTRATION:GERER` existe depuis V5 mais n'était référencée nulle part dans le code :
-- ce jalon lui donne enfin des endpoints. Cette migration complète le catalogue, historise les changements
-- de rôle, et applique deux exigences de la checklist de `docs/04_SECURITE.md §11`.

INSERT INTO permission (code, module, libelle) VALUES
    ('ADMINISTRATION:LIRE', 'ADMINISTRATION', 'Consulter les comptes, rôles et paramètres'),
    ('PARAMETRE:MODIFIER', 'ADMINISTRATION', 'Modifier une règle de paramétrage (motif obligatoire, audité)')
ON CONFLICT (code) DO NOTHING;

INSERT INTO role_permission (role_id, permission_id)
SELECT r.id, p.id FROM role r, permission p
WHERE r.code = 'SUPER_ADMIN'
  AND p.code IN ('ADMINISTRATION:LIRE', 'PARAMETRE:MODIFIER')
ON CONFLICT DO NOTHING;

-- ------------------------------------------------------------------
-- Historique des changements de responsabilité (Roles des acteurs.md §14)
-- ------------------------------------------------------------------
-- La désignation du Chef est déjà historisée (V7). Cette table couvre l'autre moitié de l'exigence :
-- toute attribution ou retrait de rôle sur un compte. Le journal d'audit la trace aussi, mais il n'est
-- lisible que par les habilitations d'audit ; cet historique est consultable dans l'écran d'administration.

CREATE TABLE historique_role_utilisateur (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    utilisateur_id UUID NOT NULL REFERENCES utilisateur(id) ON DELETE CASCADE,
    role_code VARCHAR(50) NOT NULL,
    action VARCHAR(20) NOT NULL CHECK (action IN ('ATTRIBUTION', 'RETRAIT')),
    auteur_id UUID REFERENCES utilisateur(id) ON DELETE SET NULL,
    motif TEXT,
    horodatage TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_hist_role_utilisateur ON historique_role_utilisateur(utilisateur_id, horodatage DESC);

-- ------------------------------------------------------------------
-- Journal d'audit non modifiable (docs/04_SECURITE.md §7 et §11)
-- ------------------------------------------------------------------
-- « Journal d'audit non modifiable, droits UPDATE/DELETE révoqués en base ». L'API n'expose aucune
-- écriture, mais une protection applicative seule cède à la première requête SQL directe. Le déclencheur
-- ci-dessous rend la table append-only pour TOUT client, y compris `psql`.
--
-- Choix d'un déclencheur plutôt que d'un REVOKE : l'application utilise le même rôle PostgreSQL pour
-- écrire les lignes d'audit et pour le reste, et un REVOKE sur ce rôle ne distinguerait pas l'INSERT
-- légitime d'un UPDATE illégitime. Un REVOKE explicite reste recommandé en production, sur un rôle
-- applicatif distinct du rôle de migration — c'est une tâche d'exploitation, consignée dans la checklist.

CREATE OR REPLACE FUNCTION refuser_modification_audit() RETURNS trigger AS $$
BEGIN
    RAISE EXCEPTION 'Le journal d''audit est append-only : % interdit sur journal_audit.', TG_OP
        USING ERRCODE = 'insufficient_privilege';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_journal_audit_immuable
    BEFORE UPDATE OR DELETE ON journal_audit
    FOR EACH ROW EXECUTE FUNCTION refuser_modification_audit();

-- ------------------------------------------------------------------
-- Règles paramétrables du jalon (limites de débit, docs/03_SPECIFICATIONS_API.md §12)
-- ------------------------------------------------------------------
-- Statut `A` : ces valeurs sont des propositions techniques issues du pack, à confirmer par le chef de
-- projet une fois le trafic réel observé. Elles vivent en base pour être ajustées sans redéploiement.

-- Les deux règles de `§12` sur la connexion sont distinctes et complémentaires :
--   * « 5 tentatives / 15 min / identifiant » est déjà appliquée depuis le jalon J1 par le verrouillage
--     de compte exponentiel (`ServiceAuthentificationImpl`) — elle protège UN compte ;
--   * « 20 / 15 min / IP » relève de ce filtre — elle freine un balayage de plusieurs comptes.
-- Compter 5 connexions par minute et par IP confondrait les deux et bloquerait un bureau COSITI dont
-- tous les postes partagent une même connexion, ce qui est le cas courant.
INSERT INTO parametre (cle, valeur, type_valeur, libelle, statut_validation) VALUES
    ('DEBIT_CONNEXION_PAR_IP_15MIN', '20', 'ENTIER',
     'Tentatives de connexion autorisées par tranche de 15 minutes et par adresse IP', 'A'),
    ('DEBIT_ECRITURE_PAR_MINUTE', '60', 'ENTIER',
     'Écritures (POST, PUT) autorisées par minute et par utilisateur', 'A'),
    ('DEBIT_LECTURE_PAR_MINUTE', '300', 'ENTIER',
     'Lectures autorisées par minute et par utilisateur', 'A')
ON CONFLICT (cle) DO NOTHING;
