package cm.cositi.api.adherent.service;

import cm.cositi.api.adherent.entite.Adherent;
import cm.cositi.api.adherent.repository.AdherentRepository;
import cm.cositi.api.adherent.repository.CandidatSimilariteProjection;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Service
public class ServiceDoublonAdherentImpl implements ServiceDoublonAdherent {

    /** Seuil de similarité pg_trgm — modéré volontairement pour ne pas noyer l'agent d'alertes (0.0 à 1.0). */
    private static final double SEUIL_SIMILARITE_NOM = 0.45;

    private final AdherentRepository adherentRepository;

    public ServiceDoublonAdherentImpl(AdherentRepository adherentRepository) {
        this.adherentRepository = adherentRepository;
    }

    @Override
    public List<CandidatDoublon> rechercher(CritereDoublon critere) {
        // LinkedHashMap : conserve l'ordre de force des correspondances, dédoublonne par adhérent.
        Map<UUID, CandidatDoublon> candidats = new LinkedHashMap<>();

        if (critere.telephonePrincipal() != null && !critere.telephonePrincipal().isBlank()) {
            for (Adherent a : adherentRepository.findByTelephonePrincipalAndArchiveFalse(critere.telephonePrincipal())) {
                candidats.putIfAbsent(a.getId(), versDto(a, 100, "Téléphone principal identique"));
            }
        }

        if (critere.numeroCni() != null && !critere.numeroCni().isBlank()) {
            for (Adherent a : adherentRepository.findByNumeroCniAndArchiveFalse(critere.numeroCni())) {
                candidats.putIfAbsent(a.getId(), versDto(a, 100, "Numéro CNI identique"));
            }
        }

        if (critere.nomComplet() != null && !critere.nomComplet().isBlank() && critere.zoneId() != null) {
            List<CandidatSimilariteProjection> resultats = adherentRepository.rechercherParSimilariteNom(
                    critere.nomComplet(), critere.zoneId(), SEUIL_SIMILARITE_NOM);
            for (CandidatSimilariteProjection p : resultats) {
                if (candidats.containsKey(p.getId())) {
                    continue;
                }
                adherentRepository.findById(p.getId()).ifPresent(a -> candidats.put(a.getId(),
                        versDto(a, (int) Math.round(p.getScore() * 100), "Similarité de nom dans la même zone")));
            }
        }

        return new ArrayList<>(candidats.values());
    }

    private CandidatDoublon versDto(Adherent a, int score, String motif) {
        return new CandidatDoublon(a.getId(), a.getMatricule(), a.getNomComplet(),
                masquerTelephone(a.getTelephonePrincipal()), score, motif);
    }

    /** Masque partiel du téléphone : reconnaissable pour l'agent, pas exploitable comme fichier de contacts. */
    private String masquerTelephone(String telephone) {
        if (telephone == null || telephone.length() < 4) {
            return "•••";
        }
        String premier = telephone.substring(0, 1);
        String dernier = telephone.substring(telephone.length() - 3);
        int nbMasques = telephone.length() - 4;
        return premier + "•".repeat(Math.max(nbMasques, 0)) + " " + dernier;
    }
}
