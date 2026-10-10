package cm.cositi.api.adherent.service;

import java.util.List;

/**
 * Règles de correspondance, par ordre de force : téléphone principal identique, CNI identique, similarité de
 * nom (pg_trgm) dans la même zone. Jamais de fusion automatique : l'utilisateur tranche, et le choix de créer
 * malgré l'alerte est journalisé ({@code ADHERENT_DOUBLON_IGNORE}).
 */
public interface ServiceDoublonAdherent {
    List<CandidatDoublon> rechercher(CritereDoublon critere);
}
