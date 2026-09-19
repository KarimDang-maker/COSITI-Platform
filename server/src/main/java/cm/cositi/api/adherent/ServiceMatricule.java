package cm.cositi.api.adherent;

import cm.cositi.api.commun.util.Matricules;
import org.springframework.stereotype.Service;

@Service
public class ServiceMatricule {

    private final AdherentRepository adherentRepository;

    public ServiceMatricule(AdherentRepository adherentRepository) {
        this.adherentRepository = adherentRepository;
    }

    public String genererProchain() {
        Long nextVal = adherentRepository.obtenirProchaineValeurSequenceMatricule();
        return Matricules.formater(nextVal);
    }

    public boolean estValide(String matricule) {
        return Matricules.estValide(matricule);
    }
}
