package cm.cositi.api.adhesion.dto;

import cm.cositi.api.adhesion.entite.NiveauExigence;
import cm.cositi.api.adhesion.entite.StatutCorrespondance;
import cm.cositi.api.adhesion.entite.StatutPiece;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

/**
 * Checklist documentaire dynamique d'un adhérent (document des règles v2.0, §19, §20, §24) : pour chaque pièce de la
 * matrice en vigueur, le document fourni, son statut calculé et, pour chaque information justifiée, la valeur COSITI et
 * le dernier résultat DGA. Un document présent ne vaut pas donnée vérifiée (§24).
 *
 * @param pretPourActivation aucune pièce bloquante (obligatoire et confirmée) manquante, non conforme ou expirée
 */
public record ChecklistDocumentaireDto(
        UUID adherentId,
        String matricule,
        List<Piece> pieces,
        Compteurs compteurs,
        boolean pretPourActivation,
        List<String> avertissements
) {
    public record Piece(UUID exigenceId, String code, String rubrique, String typeDocument, String libelle,
                        NiveauExigence niveau, String statutValidationRegle, boolean bloquante, boolean verificationDga,
                        String conditionApplication, StatutPiece statut, UUID documentId, Integer versionDocument,
                        LocalDate valideJusquau, List<Champ> champs) {
    }

    public record Champ(UUID exigenceId, String champ, String libelle, String valeurNumerique,
                        StatutCorrespondance dernierResultatDga, String commentaireDga) {
    }

    public record Compteurs(int pieces, int obligatoires, int fournies, int validees, int enAnomalie,
                            int bloquantesManquantes) {
    }
}
