package cm.cositi.api.parametre;

import cm.cositi.api.commun.exception.ExceptionRessourceIntrouvable;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.Instant;

@Service
public class ServiceParametreImpl implements ServiceParametre {

    private final ParametreRepository repository;
    private final ObjectMapper objectMapper;

    public ServiceParametreImpl(ParametreRepository repository, ObjectMapper objectMapper) {
        this.repository = repository;
        this.objectMapper = objectMapper;
    }

    private Parametre charger(String cle) {
        return repository.findByCle(cle)
                .orElseThrow(() -> new ExceptionRessourceIntrouvable("PARAMETRE_INTROUVABLE",
                        "Le paramètre '" + cle + "' n'existe pas."));
    }

    @Override
    public String texte(String cle) {
        return charger(cle).getValeur();
    }

    @Override
    public BigDecimal decimal(String cle) {
        return new BigDecimal(charger(cle).getValeur());
    }

    @Override
    public int entier(String cle) {
        return Integer.parseInt(charger(cle).getValeur());
    }

    @Override
    public boolean booleen(String cle) {
        return Boolean.parseBoolean(charger(cle).getValeur());
    }

    @Override
    public <T> T json(String cle, Class<T> type) {
        try {
            return objectMapper.readValue(charger(cle).getValeur(), type);
        } catch (Exception e) {
            throw new IllegalStateException("Paramètre '" + cle + "' : JSON invalide.", e);
        }
    }

    @Override
    public boolean estValide(String cle) {
        return charger(cle).estValide();
    }

    @Override
    @Transactional
    public void modifier(String cle, String valeur, String motif, String auteur) {
        Parametre p = charger(cle);
        p.setValeur(valeur);
        p.setModifieLe(Instant.now());
        p.setModifiePar(auteur);
        repository.save(p);
    }
}
