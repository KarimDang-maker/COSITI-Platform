package cm.cositi.api.historique;

import cm.cositi.api.audit.TypeOperation;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;

import java.util.Set;
import java.util.function.Predicate;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Prompt §13, §16 à §18 : historiques général et financier séparés, audit technique exclu, opérations internes
 * DGA / DAF / CNPS masquées selon les permissions, données sensibles jamais restituées.
 */
class CatalogueEvenementsHistoriqueTest {

    /** Permissions réelles du Gestionnaire des comptes utiles ici (V5 à V21). */
    private static final Predicate<String> GESTIONNAIRE =
            Set.of("ADHERENT:LIRE", "PAIEMENT:LIRE", "FRAIS_ADHESION:LIRE", "CNPS:LIRE", "CONTROLE_DGA:LIRE")::contains;
    private static final Predicate<String> AGENT = Set.of("ADHERENT:LIRE", "PAIEMENT:LIRE")::contains;
    private static final Predicate<String> DAF =
            Set.of("ADHERENT:LIRE", "PAIEMENT:LIRE", "FRAIS_ADHESION:LIRE", "RAPPORT_DAF:LIRE", "CNPS:LIRE")::contains;

    private static Set<TypeOperation> types(CategorieHistorique c, Predicate<String> p) {
        return CatalogueEvenementsHistorique.reglesVisibles(c, p).stream()
                .map(CatalogueEvenementsHistorique.Regle::type)
                .collect(java.util.stream.Collectors.toSet());
    }

    @Test
    void lesDeuxHistoriquesNeSeRecouvrentPas() {
        var general = types(CategorieHistorique.GENERAL, DAF);
        var financier = types(CategorieHistorique.FINANCIER, DAF);

        assertThat(general).doesNotContainAnyElementsOf(financier);
        assertThat(general).contains(TypeOperation.ADHERENT_CREATION, TypeOperation.ADHERENT_MODIFICATION_CONTACT,
                TypeOperation.ADHERENT_MODIFICATION_PROFESSIONNELLE, TypeOperation.DOCUMENT_TELEVERSEMENT,
                TypeOperation.CNPS_CHANGEMENT_STATUT, TypeOperation.ADHERENT_CHANGEMENT_STATUT);
        assertThat(financier).contains(TypeOperation.FRAIS_ADHESION_ENREGISTREMENT, TypeOperation.PAIEMENT_CREATION,
                TypeOperation.PAIEMENT_VALIDATION, TypeOperation.PAIEMENT_REJET, TypeOperation.PAIEMENT_CORRECTION,
                TypeOperation.AFFECTATION_CREATION);
    }

    @Test
    void lAuditTechniqueNEntreJamaisDansLHistorique() {
        Set<TypeOperation> techniques = Set.of(TypeOperation.CONNEXION_SUCCES, TypeOperation.CONNEXION_ECHEC,
                TypeOperation.DOCUMENT_CONSULTATION, TypeOperation.EXPORT_SENSIBLE, TypeOperation.ACCES_REFUSE,
                TypeOperation.RAFRAICHISSEMENT_JETON, TypeOperation.PARAMETRE_MODIFICATION);

        assertThat(CatalogueEvenementsHistorique.toutes())
                .noneMatch(r -> techniques.contains(r.type()));
    }

    @Test
    void leTravailInterneDeLaDafEstMasqueAuGestionnaire() {
        var gestionnaire = types(CategorieHistorique.FINANCIER, GESTIONNAIRE);
        var daf = types(CategorieHistorique.FINANCIER, DAF);

        assertThat(gestionnaire).doesNotContain(TypeOperation.FRAIS_ADHESION_ANOMALIE_SIGNALEE,
                TypeOperation.DROITS_RECALCUL, TypeOperation.PAIEMENT_RAPPROCHEMENT);
        assertThat(daf).contains(TypeOperation.FRAIS_ADHESION_ANOMALIE_SIGNALEE, TypeOperation.DROITS_RECALCUL);
        assertThat(CatalogueEvenementsHistorique.contientMasques(CategorieHistorique.FINANCIER, GESTIONNAIRE)).isTrue();
        // Une période de droits ouverte reste visible ; la note interne d'imputation ne l'est pas.
        assertThat(CatalogueEvenementsHistorique.reglesVisibles(CategorieHistorique.FINANCIER, GESTIONNAIRE))
                .anyMatch(r -> r.cle().equals("DROITS_IMPUTATION@periode_droits"))
                .noneMatch(r -> r.cle().equals("DROITS_IMPUTATION@adherent"));
    }

    @Test
    void leDetailDuControleDgaEtLeDossierCnpsSuiventLesPermissions() {
        var agent = types(CategorieHistorique.GENERAL, AGENT);

        assertThat(agent).doesNotContain(TypeOperation.CONTROLE_DGA_CHAMP_VERIFIE, TypeOperation.CNPS_CHANGEMENT_STATUT)
                .contains(TypeOperation.CONTROLE_DGA_TERMINE, TypeOperation.DOCUMENT_TELEVERSEMENT);
        assertThat(types(CategorieHistorique.GENERAL, GESTIONNAIRE)).contains(TypeOperation.CONTROLE_DGA_CHAMP_VERIFIE);
    }

    @Test
    void lesDemandesDeValidationSontRangeesSelonLeurCible() {
        var surCotisation = CatalogueEvenementsHistorique.regle(TypeOperation.DEMANDE_VALIDATION_APPROBATION,
                "demande_validation", CategorieHistorique.FINANCIER).orElseThrow();
        var surDossier = CatalogueEvenementsHistorique.regle(TypeOperation.DEMANDE_VALIDATION_APPROBATION,
                "demande_validation", CategorieHistorique.GENERAL).orElseThrow();

        assertThat(surCotisation.categorie()).isEqualTo(CategorieHistorique.FINANCIER);
        assertThat(surDossier.categorie()).isEqualTo(CategorieHistorique.GENERAL);
    }

    @Test
    void lesDonneesSensiblesModifieesSontMasquees() throws Exception {
        ObjectMapper om = new ObjectMapper();
        JsonNode avant = om.readTree("{\"nom\":\"Ateba\",\"numeroCni\":\"123\",\"telephonePrincipal\":\"677000000\","
                + "\"quartier\":\"Mvog\",\"version\":3}");
        JsonNode apres = om.readTree("{\"nom\":\"Atéba\",\"numeroCni\":\"456\",\"telephonePrincipal\":\"677000000\","
                + "\"quartier\":\"Essos\",\"version\":4}");

        var modifications = ServiceHistoriqueAdherentImpl.modifications(avant, apres);

        assertThat(modifications).extracting("champ").containsExactlyInAnyOrder("nom", "numeroCni", "quartier");
        assertThat(modifications).filteredOn(m -> m.champ().equals("numeroCni"))
                .singleElement().satisfies(m -> {
                    assertThat(m.masque()).isTrue();
                    assertThat(m.avant()).isEqualTo("***");
                    assertThat(m.apres()).isEqualTo("***");
                });
        assertThat(modifications).filteredOn(m -> m.champ().equals("quartier"))
                .singleElement().satisfies(m -> assertThat(m.apres()).isEqualTo("Essos"));
    }

    @Test
    void lesDetailsFinanciersViennentDUneListeBlancheEtLaReferenceDuRecu() throws Exception {
        ObjectMapper om = new ObjectMapper();
        JsonNode apres = om.readTree("{\"numeroRecu\":\"REC-000007\",\"montant\":1500,\"montantSecuriteSociale\":700,"
                + "\"montantEpargne\":800,\"statut\":\"A_CONTROLER\",\"referenceTransaction\":\"OM-SECRET\","
                + "\"cleIdempotence\":\"x\"}");

        var details = ServiceHistoriqueAdherentImpl.details(null, apres);

        assertThat(details).containsKeys("numeroRecu", "montant", "montantSecuriteSociale", "montantEpargne", "statut")
                .doesNotContainKeys("referenceTransaction", "cleIdempotence");
        assertThat(ServiceHistoriqueAdherentImpl.reference(apres, null)).isEqualTo("REC-000007");
        // Objet imbriqué (frais d'adhésion tracé sous « frais ») : la référence est trouvée un niveau plus bas.
        assertThat(ServiceHistoriqueAdherentImpl.reference(om.readTree("{\"frais\":{\"reference\":\"FAD-000004\"}}"),
                null)).isEqualTo("FAD-000004");
    }
}
