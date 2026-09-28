package cm.cositi.api.commun.entite;

import jakarta.persistence.Column;
import jakarta.persistence.MappedSuperclass;

import java.time.Instant;

/**
 * Ajoute l'archivage logique (jamais de suppression physique — {@code AGENTS.md} règle absolue n°3).
 * Réservée aux entités dont la table possède les quatre colonnes {@code archive, archive_le, archive_par,
 * motif_archivage} (zone, agent, adherent).
 */
@MappedSuperclass
public abstract class EntiteArchivable extends EntiteAuditable {

    @Column(name = "archive", nullable = false)
    protected boolean archive = false;

    @Column(name = "archive_le")
    protected Instant archiveLe;

    @Column(name = "archive_par", length = 80)
    protected String archivePar;

    @Column(name = "motif_archivage", columnDefinition = "TEXT")
    protected String motifArchivage;

    public boolean isArchive() {
        return archive;
    }

    public Instant getArchiveLe() {
        return archiveLe;
    }

    public String getArchivePar() {
        return archivePar;
    }

    public String getMotifArchivage() {
        return motifArchivage;
    }

    public void archiver(String auteur, String motif) {
        this.archive = true;
        this.archiveLe = Instant.now();
        this.archivePar = auteur;
        this.motifArchivage = motif;
    }
}
