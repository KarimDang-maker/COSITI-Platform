package cm.cositi.api.adherent.service;

public interface ServiceMatricule {

    /** Génère le prochain matricule (format {@code COSITI-0000N}) via la séquence PostgreSQL dédiée. */
    String genererProchain();

    boolean estValide(String matricule);
}
