package cm.cositi.api.commun.util;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import javax.crypto.Cipher;
import javax.crypto.SecretKey;
import javax.crypto.spec.GCMParameterSpec;
import javax.crypto.spec.SecretKeySpec;
import java.security.GeneralSecurityException;
import java.security.SecureRandom;
import java.util.Base64;

/**
 * Chiffrement au repos des documents — AES-256-GCM (docs/04_SECURITE.md §4).
 *
 * <p>La clé vient exclusivement de la configuration ({@code cositi.stockage.cle-chiffrement}, alimentée par la
 * variable d'environnement {@code STORAGE_ENCRYPTION_KEY}). Même politique que le secret JWT : la valeur
 * présente dans {@code application.properties} n'est qu'un repli de développement local, et le composant
 * refuse de démarrer si la clé n'a pas la taille attendue — une clé faible vaudrait une absence de
 * chiffrement, en moins visible.</p>
 *
 * <p>Format produit : {@code [IV sur 12 octets][texte chiffré + tag GCM sur 16 octets]}. Le vecteur
 * d'initialisation est tiré aléatoirement à chaque écriture et stocké en tête du fichier : il n'est pas
 * secret, mais ne doit jamais être réutilisé avec la même clé.</p>
 *
 * <p><b>Rotation de clé</b> : non implémentée en V1 (une seule clé active). Le format porte déjà son IV par
 * fichier, ce qui rend une future rotation possible sans réécrire les fichiers existants, à condition
 * d'ajouter un identifiant de clé — à prévoir avant la mise en production, cf. docs/04_SECURITE.md §11.</p>
 */
@Component
public class ChiffrementFichier {

    private static final String ALGORITHME = "AES/GCM/NoPadding";
    private static final int TAILLE_IV_OCTETS = 12;
    private static final int TAILLE_TAG_BITS = 128;
    private static final int TAILLE_CLE_OCTETS = 32;

    private final SecretKey cle;
    private final SecureRandom aleatoire = new SecureRandom();

    public ChiffrementFichier(@Value("${cositi.stockage.cle-chiffrement:}") String cleBase64) {
        if (cleBase64 == null || cleBase64.isBlank()) {
            throw new IllegalStateException(
                    "cositi.stockage.cle-chiffrement est absent : les documents ne peuvent pas être chiffrés au repos "
                            + "(docs/04_SECURITE.md §4). Renseigner la variable d'environnement STORAGE_ENCRYPTION_KEY.");
        }
        byte[] octets;
        try {
            octets = Base64.getDecoder().decode(cleBase64);
        } catch (IllegalArgumentException e) {
            throw new IllegalStateException("cositi.stockage.cle-chiffrement n'est pas un base64 valide.", e);
        }
        if (octets.length != TAILLE_CLE_OCTETS) {
            throw new IllegalStateException("cositi.stockage.cle-chiffrement doit faire 256 bits (32 octets une fois "
                    + "décodé), taille reçue : " + octets.length + " octets.");
        }
        this.cle = new SecretKeySpec(octets, "AES");
    }

    public byte[] chiffrer(byte[] clair) {
        try {
            byte[] iv = new byte[TAILLE_IV_OCTETS];
            aleatoire.nextBytes(iv);
            Cipher cipher = Cipher.getInstance(ALGORITHME);
            cipher.init(Cipher.ENCRYPT_MODE, cle, new GCMParameterSpec(TAILLE_TAG_BITS, iv));
            byte[] chiffre = cipher.doFinal(clair);
            byte[] resultat = new byte[iv.length + chiffre.length];
            System.arraycopy(iv, 0, resultat, 0, iv.length);
            System.arraycopy(chiffre, 0, resultat, iv.length, chiffre.length);
            return resultat;
        } catch (GeneralSecurityException e) {
            throw new IllegalStateException("Échec du chiffrement du document.", e);
        }
    }

    public byte[] dechiffrer(byte[] donnees) {
        if (donnees.length <= TAILLE_IV_OCTETS) {
            throw new IllegalStateException("Fichier chiffré tronqué ou corrompu.");
        }
        try {
            byte[] iv = new byte[TAILLE_IV_OCTETS];
            System.arraycopy(donnees, 0, iv, 0, TAILLE_IV_OCTETS);
            Cipher cipher = Cipher.getInstance(ALGORITHME);
            cipher.init(Cipher.DECRYPT_MODE, cle, new GCMParameterSpec(TAILLE_TAG_BITS, iv));
            return cipher.doFinal(donnees, TAILLE_IV_OCTETS, donnees.length - TAILLE_IV_OCTETS);
        } catch (GeneralSecurityException e) {
            // Inclut l'échec de vérification du tag GCM : le fichier a été modifié sur le disque.
            throw new IllegalStateException("Échec du déchiffrement du document (contenu altéré ou clé différente).", e);
        }
    }
}
