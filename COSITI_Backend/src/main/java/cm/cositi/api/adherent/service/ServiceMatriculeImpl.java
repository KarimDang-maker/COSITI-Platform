package cm.cositi.api.adherent.service;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

import java.util.regex.Pattern;

/**
 * Utilise {@code seq_matricule_adherent} (créée par V2__organisation_adherents.sql), jamais {@code MAX(...)+1}
 * qui n'est pas sûr en concurrence (docs/02_CLASSES_ET_METHODES.md §3).
 */
@Service
public class ServiceMatriculeImpl implements ServiceMatricule {

    private static final String PREFIXE = "COSITI-";
    private static final Pattern FORMAT = Pattern.compile("^COSITI-\\d{5,}$");

    private final JdbcTemplate jdbcTemplate;

    public ServiceMatriculeImpl(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    @Override
    public String genererProchain() {
        Long valeur = jdbcTemplate.queryForObject("SELECT nextval('seq_matricule_adherent')", Long.class);
        return PREFIXE + String.format("%05d", valeur);
    }

    @Override
    public boolean estValide(String matricule) {
        return matricule != null && FORMAT.matcher(matricule).matches();
    }
}
