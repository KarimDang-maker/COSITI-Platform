-- V6__jetons_rafraichissement.sql
-- Jetons de rafraîchissement opaques (jalon J1) : stockage haché, rotation à chaque usage,
-- détection de réutilisation par famille (docs/04_SECURITE.md §2).

CREATE TABLE jeton_rafraichissement (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    utilisateur_id UUID NOT NULL REFERENCES utilisateur(id) ON DELETE CASCADE,
    jeton_hash VARCHAR(255) UNIQUE NOT NULL,
    famille_id UUID NOT NULL,
    cree_le TIMESTAMPTZ NOT NULL DEFAULT now(),
    expire_le TIMESTAMPTZ NOT NULL,
    revoque BOOLEAN NOT NULL DEFAULT false,
    revoque_le TIMESTAMPTZ,
    remplace_par_id UUID REFERENCES jeton_rafraichissement(id) ON DELETE SET NULL,
    adresse_ip VARCHAR(45),
    user_agent VARCHAR(255)
);

CREATE INDEX idx_jeton_rafraichissement_famille ON jeton_rafraichissement(famille_id);
CREATE INDEX idx_jeton_rafraichissement_utilisateur ON jeton_rafraichissement(utilisateur_id, revoque);
