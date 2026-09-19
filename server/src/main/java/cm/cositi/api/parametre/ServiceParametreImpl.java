package cm.cositi.api.parametre;

import cm.cositi.api.commun.exception.ExceptionRessourceIntrouvable;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;

@Service
@Transactional
public class ServiceParametreImpl implements ServiceParametre {

    private static final Logger log = LoggerFactory.getLogger(ServiceParametreImpl.class);
    private final ParametreRepository parametreRepository;

    public ServiceParametreImpl(ParametreRepository parametreRepository) {
        this.parametreRepository = parametreRepository;
    }

    @Override
    @Transactional(readOnly = true)
    public String texte(String cle) {
        Parametre p = parametreRepository.findByCle(cle)
                .orElseThrow(() -> new ExceptionRessourceIntrouvable("Paramètre métier introuvable: " + cle));
        avertirSiNonValide(p);
        return p.getValeur();
    }

    @Override
    @Transactional(readOnly = true)
    public BigDecimal decimal(String cle) {
        return new BigDecimal(texte(cle));
    }

    @Override
    @Transactional(readOnly = true)
    public int entier(String cle) {
        return Integer.parseInt(texte(cle));
    }

    @Override
    @Transactional(readOnly = true)
    public boolean booleen(String cle) {
        return Boolean.parseBoolean(texte(cle));
    }

    @Override
    @Transactional(readOnly = true)
    public boolean estValide(String cle) {
        return parametreRepository.findByCle(cle)
                .map(p -> !"V".equalsIgnoreCase(p.getStatutValidation()))
                .orElse(false);
    }

    @Override
    public void modifier(String cle, String valeur, String motif, String auteur) {
        Parametre p = parametreRepository.findByCle(cle)
                .orElseThrow(() -> new ExceptionRessourceIntrouvable("Paramètre métier introuvable: " + cle));
        p.setValeur(valeur);
        p.setModifieLe(Instant.now());
        p.setModifiePar(auteur);
        parametreRepository.save(p);
        log.info("Paramètre {} modifié par {} (motif: {}). Nouvelle valeur: {}", cle, auteur, motif, valeur);
    }

    @Override
    @Transactional(readOnly = true)
    public List<Parametre> listerTous() {
        return parametreRepository.findAll();
    }

    private void avertirSiNonValide(Parametre p) {
        if ("V".equalsIgnoreCase(p.getStatutValidation())) {
            log.warn("AVERTISSEMENT [V] : Utilisation de la règle non validée par la COSITI : {} (Valeur actuelle: {})",
                    p.getCle(), p.getValeur());
        }
    }
}
