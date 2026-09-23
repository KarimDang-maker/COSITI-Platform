package cm.cositi.api.document.dto;

/**
 * Contenu déchiffré d'un document, prêt à être écrit dans la réponse HTTP.
 *
 * <p>Renvoyé en mémoire et jamais écrit sur disque en clair : docs/04_SECURITE.md §4 impose qu'aucun fichier
 * ne soit laissé sur disque après téléchargement. La taille est bornée en amont par
 * {@code cositi.stockage.taille-max-octets}.</p>
 */
public record ContenuDocument(String nomFichier, String typeMime, byte[] octets) {
}
