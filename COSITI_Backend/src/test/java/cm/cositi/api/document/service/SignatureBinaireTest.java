package cm.cositi.api.document.service;

import org.junit.jupiter.api.Test;

import java.nio.charset.StandardCharsets;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Le type d'un fichier est déterminé par son contenu, jamais par ce que le client en dit
 * (docs/04_SECURITE.md §5). Ces tests valent surtout pour le dernier : un exécutable renommé en {@code .pdf}
 * doit être refusé.
 */
class SignatureBinaireTest {

    @Test
    void reconnait_un_jpeg_par_ses_octets_de_tete() {
        byte[] jpeg = {(byte) 0xFF, (byte) 0xD8, (byte) 0xFF, (byte) 0xE0, 0x00, 0x10};

        assertThat(SignatureBinaire.typeMimeReel(jpeg)).contains("image/jpeg");
    }

    @Test
    void reconnait_un_png_par_ses_octets_de_tete() {
        byte[] png = {(byte) 0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, 0x00};

        assertThat(SignatureBinaire.typeMimeReel(png)).contains("image/png");
    }

    @Test
    void reconnait_un_pdf_par_ses_octets_de_tete() {
        byte[] pdf = "%PDF-1.7\n...".getBytes(StandardCharsets.US_ASCII);

        assertThat(SignatureBinaire.typeMimeReel(pdf)).contains("application/pdf");
    }

    @Test
    void refuse_un_executable_meme_si_le_nom_dit_pdf() {
        // En-tête MZ d'un exécutable Windows. Le nom du fichier n'entre pas dans la décision.
        byte[] executable = {0x4D, 0x5A, (byte) 0x90, 0x00, 0x03, 0x00, 0x00, 0x00};

        assertThat(SignatureBinaire.typeMimeReel(executable)).isEmpty();
    }

    @Test
    void refuse_un_contenu_vide_ou_trop_court_pour_etre_identifie() {
        assertThat(SignatureBinaire.typeMimeReel(new byte[0])).isEmpty();
        assertThat(SignatureBinaire.typeMimeReel(new byte[]{(byte) 0xFF})).isEmpty();
        assertThat(SignatureBinaire.typeMimeReel(null)).isEmpty();
    }
}
