package cm.cositi.api.cotisation.dto;

import cm.cositi.api.adherent.entite.Adherent;
import cm.cositi.api.cotisation.entite.Paiement;
import cm.cositi.api.cotisation.entite.StatutPaiement;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;

/**
 * Reçu d'une cotisation, prêt à imprimer. Les champs postérieurs aux sept premiers (identité de l'adhérent, répartition,
 * référence, auteur, date d'édition) sont additifs : un reçu doit permettre à l'adhérent de vérifier ce qui a été
 * enregistré à son nom.
 */
public record RecuDto(UUID paiementId, String numeroRecu, UUID adherentId, BigDecimal montant,
                      LocalDate datePaiement, String modePaiement, StatutPaiement statut,
                      String adherentMatricule, String adherentNom, BigDecimal montantSecuriteSociale,
                      BigDecimal montantEpargne, String referenceTransaction, String typePaiement,
                      String enregistrePar, Instant enregistreLe, Instant editeLe) {

    public static RecuDto depuis(Paiement p) {
        return depuis(p, null);
    }

    public static RecuDto depuis(Paiement p, Adherent a) {
        return new RecuDto(p.getId(), p.getNumeroRecu(), p.getAdherentId(), p.getMontant(), p.getDatePaiement(),
                p.getModePaiement(), p.getStatut(), a == null ? null : a.getMatricule(),
                a == null ? null : a.getNomComplet(), p.getMontantSecuriteSociale(), p.getMontantEpargne(),
                p.getReferenceTransaction(), p.getTypePaiement(), p.getCreePar(), p.getCreeLe(), Instant.now());
    }
}
