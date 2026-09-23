package cm.cositi.api.cnps.service;

import cm.cositi.api.cnps.dto.DeclarationCnpsDto;
import cm.cositi.api.securite.entite.Utilisateur;

import java.time.YearMonth;
import java.util.List;
import java.util.UUID;

/** docs/02_CLASSES_ET_METHODES.md §6 — Déclarations CNPS (jalon J7). */
public interface ServiceDeclarationCnps {

    /**
     * Prépare (ou renvoie, si elle existe déjà) la déclaration d'un dossier pour un mois donné.
     *
     * <p>Le montant est construit à partir des périodes de droits réellement imputées sur le mois, jamais
     * d'une assiette reconstituée. Si le dossier n'a pas de {@code revenu_mensuel_declare}, la préparation
     * aboutit mais porte un avertissement explicite — règle {@code [V]} {@code ASSIETTE_CNPS}.</p>
     */
    DeclarationCnpsDto preparer(UUID dossierId, YearMonth periode, Utilisateur auteur);

    DeclarationCnpsDto marquerTransmise(UUID declarationId, UUID accuseDocumentId, Utilisateur auteur);

    /** Dossiers immatriculés sans déclaration transmise pour le mois demandé. */
    List<DeclarationCnpsDto> aProduire(YearMonth periode, Utilisateur demandeur);

    List<DeclarationCnpsDto> parDossier(UUID dossierId, Utilisateur demandeur);
}
