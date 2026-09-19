package cm.cositi.api.commun.entite;

import jakarta.persistence.Column;
import jakarta.persistence.MappedSuperclass;
import org.hibernate.annotations.SQLRestriction;

import java.time.Instant;

@MappedSuperclass
@SQLRestriction("archive = false")
public abstract class EntiteArchivable extends EntiteAuditable {

    @Column(name = "archive", nullable = false)
    protected boolean archive = false;

    @Column(name = "archive_le")
    protected Instant archiveLe;

    @Column(name = "archive_par")
    protected String archivePar;

    @Column(name = "motif_archivage", columnDefinition = "TEXT")
    protected String motifArchivage;

    public boolean isArchive() { return archive; }
    public void setArchive(boolean archive) { this.archive = archive; }
    public Instant getArchiveLe() { return archiveLe; }
    public void setArchiveLe(Instant archiveLe) { this.archiveLe = archiveLe; }
    public String getArchivePar() { return archivePar; }
    public void setArchivePar(String archivePar) { this.archivePar = archivePar; }
    public String getMotifArchivage() { return motifArchivage; }
    public void setMotifArchivage(String motifArchivage) { this.motifArchivage = motifArchivage; }

    public void archiver(String auteur, String motif) {
        this.archive = true;
        this.archiveLe = Instant.now();
        this.archivePar = auteur;
        this.motifArchivage = motif;
    }
}
