package cm.cositi.api.cotisation.service;

import cm.cositi.api.commun.reponse.ReponsePaginee;
import cm.cositi.api.cotisation.dto.BilanJournalierDto;
import cm.cositi.api.cotisation.dto.RapprochementCaisseDto;
import cm.cositi.api.cotisation.entite.StatutBilanCaisse;
import cm.cositi.api.securite.entite.Utilisateur;
import org.springframework.data.domain.Pageable;

import java.math.BigDecimal;
import java.time.LocalDate;

/**
 * Bilan journalier de caisse (#29 à #33). Séparation des responsabilités (AGENTS.md règle absolue n°5) : celui
 * qui saisit la caisse physique ne valide jamais son propre bilan ; la validation et le signalement d'anomalie
 * sont réservés au DAF (matrice §5).
 */
public interface ServiceBilanCaisse {

    /** #29 — total numérique de la journée selon la définition paramétrée {@code BILAN_CAISSE_*} ({@code [V]}). */
    BilanJournalierDto bilanJournalier(LocalDate date, Utilisateur demandeur);

    /**
     * #30 — enregistre le montant physique compté. Un seul bilan par date : refusé s'il existe déjà, sauf s'il est
     * en {@code ANOMALIE}, auquel cas la nouvelle saisie le remplace et le renvoie au DAF.
     */
    RapprochementCaisseDto saisirCaissePhysique(LocalDate date, BigDecimal montantPhysique, String commentaire,
                                                Utilisateur auteur);

    /** #31 — rapprochement d'une date : écart figé à la saisie + montant numérique recalculé à l'instant. */
    RapprochementCaisseDto rapprochement(LocalDate date, Utilisateur demandeur);

    ReponsePaginee<RapprochementCaisseDto> lister(LocalDate du, LocalDate au, StatutBilanCaisse statut,
                                                  Pageable pageable, Utilisateur demandeur);

    /** #32 — validation DAF, jamais par l'auteur de la saisie. */
    RapprochementCaisseDto valider(LocalDate date, String commentaire, Long versionAttendue, Utilisateur daf);

    /** #33 — anomalie motivée, notifiée à l'auteur de la saisie. */
    RapprochementCaisseDto signalerAnomalie(LocalDate date, String motif, Utilisateur daf);
}
