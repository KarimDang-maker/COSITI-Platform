package cm.cositi.api.tempsreel;

import cm.cositi.api.securite.entite.Utilisateur;
import org.junit.jupiter.api.Test;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;

import java.util.Collection;
import java.util.List;
import java.util.Set;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatCode;
import static org.mockito.Mockito.doReturn;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

class ServiceDiffusionTempsReelTest {

    @Test
    void unDomaineNEstServiQuAuxPorteursDeSaPermissionDeLecture() {
        assertThat(ServiceDiffusionTempsReel.autorise(Set.of("PAIEMENT:LIRE"), "paiement")).isTrue();
        assertThat(ServiceDiffusionTempsReel.autorise(Set.of("PAIEMENT:LIRE"), "adherent")).isFalse();
        assertThat(ServiceDiffusionTempsReel.autorise(Set.of("CONTROLE_DGA:LIRE"), "adhesion")).isTrue();
        assertThat(ServiceDiffusionTempsReel.autorise(Set.of("ORGANISATION:LIRE"), "workflow")).isTrue();
        assertThat(ServiceDiffusionTempsReel.autorise(Set.of("ADHERENT:LIRE"), "bilan_caisse")).isFalse();
    }

    @Test
    void unDomaineInconnuNEstServiAPersonne() {
        assertThat(ServiceDiffusionTempsReel.autorise(Set.of("ADHERENT:LIRE", "PAIEMENT:LIRE"), "inconnu")).isFalse();
    }

    @Test
    void lePlafondDeFluxParUtilisateurFermeLePlusAncien() {
        ServiceDiffusionTempsReel service = new ServiceDiffusionTempsReel(60_000, 2);
        Utilisateur u = utilisateur(UUID.randomUUID(), "ADHERENT:LIRE");

        service.abonner(u);
        service.abonner(u);
        service.abonner(u);

        assertThat(service.nombreAbonnes()).isEqualTo(2);
    }

    @Test
    void lesFluxDeDeuxUtilisateursSontIndependants() {
        ServiceDiffusionTempsReel service = new ServiceDiffusionTempsReel(60_000, 1);

        service.abonner(utilisateur(UUID.randomUUID(), "ADHERENT:LIRE"));
        service.abonner(utilisateur(UUID.randomUUID(), "PAIEMENT:LIRE"));

        assertThat(service.nombreAbonnes()).isEqualTo(2);
    }

    @Test
    void laDiffusionEtLeBattementNeLevenJamaisDException() {
        ServiceDiffusionTempsReel service = new ServiceDiffusionTempsReel(60_000, 5);
        service.abonner(utilisateur(UUID.randomUUID(), "ADHERENT:LIRE"));

        assertThatCode(() -> {
            service.diffuser(EvenementTempsReel.de("adherent", UUID.randomUUID(), null, "MODIFICATION"));
            service.diffuser(EvenementTempsReel.de("paiement", UUID.randomUUID(), null, "VALIDATION"));
            service.battement();
        }).doesNotThrowAnyException();
    }

    private static Utilisateur utilisateur(UUID id, String... permissions) {
        Utilisateur u = mock(Utilisateur.class);
        when(u.getId()).thenReturn(id);
        Collection<? extends GrantedAuthority> autorites = List.of(permissions).stream()
                .map(SimpleGrantedAuthority::new).toList();
        doReturn(autorites).when(u).getAuthorities();
        return u;
    }
}
