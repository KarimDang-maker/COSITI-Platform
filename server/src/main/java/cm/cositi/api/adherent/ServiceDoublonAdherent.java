package cm.cositi.api.adherent;

import cm.cositi.api.adherent.dto.CandidatDoublonDto;
import cm.cositi.api.adherent.dto.CritereDoublonDto;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.List;

@Service
@Transactional(readOnly = true)
public class ServiceDoublonAdherent {

    private final AdherentRepository adherentRepository;

    public ServiceDoublonAdherent(AdherentRepository adherentRepository) {
        this.adherentRepository = adherentRepository;
    }

    public List<CandidatDoublonDto> rechercher(CritereDoublonDto critere) {
        List<CandidatDoublonDto> candidats = new ArrayList<>();

        // 1. Détection par numéro de téléphone principal identique
        if (critere.telephonePrincipal() != null && !critere.telephonePrincipal().isBlank()) {
            adherentRepository.findByTelephonePrincipal(critere.telephonePrincipal())
                    .ifPresent(adh -> candidats.add(new CandidatDoublonDto(
                            adh.getId(),
                            adh.getMatricule(),
                            adh.getNom() + " " + (adh.getPrenoms() != null ? adh.getPrenoms() : ""),
                            masquerTelephone(adh.getTelephonePrincipal()),
                            100,
                            "Numéro de téléphone principal identique"
                    )));
        }

        // 2. Détection par numéro de CNI identique
        if (critere.numeroCni() != null && !critere.numeroCni().isBlank()) {
            adherentRepository.findByNumeroCni(critere.numeroCni())
                    .ifPresent(adh -> {
                        boolean dejaPresent = candidats.stream().anyMatch(c -> c.adherentId().equals(adh.getId()));
                        if (!dejaPresent) {
                            candidats.add(new CandidatDoublonDto(
                                    adh.getId(),
                                    adh.getMatricule(),
                                    adh.getNom() + " " + (adh.getPrenoms() != null ? adh.getPrenoms() : ""),
                                    masquerTelephone(adh.getTelephonePrincipal()),
                                    100,
                                    "Numéro de CNI identique"
                            ));
                        }
                    });
        }

        return candidats;
    }

    public String masquerTelephone(String tel) {
        if (tel == null || tel.length() < 5) return "***";
        return tel.charAt(0) + "•• ••• " + tel.substring(tel.length() - 3);
    }
}
