package cm.cositi.api.adhesion.dto;

import cm.cositi.api.adhesion.entite.StatutControle;
import cm.cositi.api.adhesion.entite.StatutCorrespondance;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

/**
 * Un tour de contrôle documentaire DGA avec ses documents et, pour chacun, la comparaison donnée COSITI / document
 * physique (§13). Les compteurs alimentent le résumé avant finalisation (§15).
 */
public record ControleDgaDto(
        UUID id,
        String reference,
        UUID adherentId,
        String adherentMatricule,
        String adherentNom,
        int tour,
        UUID controlePrecedentId,
        StatutControle statut,
        UUID soumisPar,
        Instant soumisLe,
        UUID demarrePar,
        Instant demarreLe,
        UUID terminePar,
        Instant termineLe,
        String commentaireDecision,
        Compteurs compteurs,
        List<Document> documents,
        /** §27, §32 : la validation n'est possible que sans blocage — le frontend désactive « VALIDER » sinon. */
        boolean validable,
        List<String> blocages,
        Long version
) {
    public record Compteurs(int documents, int documentsConformes, int documentsEnAnomalie, int champs,
                            int champsVerifies, int champsConformes, int anomalies, int nonVerifiables) {
    }

    public record Document(UUID id, UUID documentId, String typeDocument, boolean obligatoire, String statut,
                           List<Champ> champs) {
    }

    public record Champ(UUID id, String champ, String libelle, String valeurNumerique, String valeurPhysique,
                        StatutCorrespondance statutCorrespondance, String commentaire, UUID verifiePar,
                        Instant verifieLe, Long version) {
    }
}
