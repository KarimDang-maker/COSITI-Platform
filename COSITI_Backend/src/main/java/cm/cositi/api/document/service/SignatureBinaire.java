package cm.cositi.api.document.service;

import java.util.Arrays;
import java.util.List;
import java.util.Optional;

/**
 * Détermination du type réel d'un fichier par ses premiers octets (« magic bytes »).
 *
 * <p>docs/04_SECURITE.md §5 et docs/02_CLASSES_ET_METHODES.md §7 : le type MIME est validé <b>par signature
 * binaire, jamais par extension ni par l'en-tête {@code Content-Type} fourni par le client</b>. Les deux
 * sont contrôlés par l'appelant, pas par nous.</p>
 *
 * <p>Liste blanche volontairement courte : JPEG, PNG et PDF couvrent les pièces attendues (CNI, acte de
 * naissance, photo d'identité, formulaire signé, preuve de paiement, accusé CNPS). Tout le reste est
 * refusé — y compris les formats bureautiques, qui sont des conteneurs exécutables en puissance.</p>
 */
public final class SignatureBinaire {

    /** Un type autorisé, avec le préfixe d'octets qui l'identifie. */
    private record Signature(String typeMime, byte[] prefixe) {
    }

    private static final List<Signature> SIGNATURES = List.of(
            // JPEG : FF D8 FF
            new Signature("image/jpeg", new byte[]{(byte) 0xFF, (byte) 0xD8, (byte) 0xFF}),
            // PNG : 89 50 4E 47 0D 0A 1A 0A
            new Signature("image/png", new byte[]{(byte) 0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A}),
            // PDF : "%PDF-"
            new Signature("application/pdf", new byte[]{0x25, 0x50, 0x44, 0x46, 0x2D})
    );

    /** Plus long préfixe à lire pour pouvoir trancher. */
    public static final int OCTETS_A_LIRE = 8;

    private SignatureBinaire() {
    }

    /**
     * Type MIME réel du contenu, ou {@link Optional#empty()} si aucune signature de la liste blanche ne
     * correspond — auquel cas le fichier doit être refusé.
     */
    public static Optional<String> typeMimeReel(byte[] contenu) {
        if (contenu == null) {
            return Optional.empty();
        }
        return SIGNATURES.stream()
                .filter(signature -> commencePar(contenu, signature.prefixe()))
                .map(Signature::typeMime)
                .findFirst();
    }

    public static List<String> typesMimeAutorises() {
        return SIGNATURES.stream().map(Signature::typeMime).toList();
    }

    private static boolean commencePar(byte[] contenu, byte[] prefixe) {
        if (contenu.length < prefixe.length) {
            return false;
        }
        return Arrays.equals(contenu, 0, prefixe.length, prefixe, 0, prefixe.length);
    }
}
