package cm.cositi.api.regle.service;

import cm.cositi.api.adhesion.dto.ExigenceDocumentaireDto;
import cm.cositi.api.adhesion.entite.NiveauExigence;
import cm.cositi.api.adhesion.service.ServiceExigenceDocumentaire;
import cm.cositi.api.audit.ServiceAudit;
import cm.cositi.api.audit.TypeOperation;
import cm.cositi.api.commun.exception.ExceptionValidation;
import cm.cositi.api.parametre.Parametre;
import cm.cositi.api.parametre.ParametreRepository;
import cm.cositi.api.securite.entite.Utilisateur;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.lang.reflect.Field;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class ServiceRegleImplTest {

    @Mock
    private ParametreRepository parametreRepository;
    @Mock
    private ServiceExigenceDocumentaire serviceExigence;
    @Mock
    private ServiceAudit serviceAudit;

    private ServiceRegleImpl service;
    private final Utilisateur pca = new Utilisateur("pca1", "hash", "PCA");

    @BeforeEach
    void setUp() {
        service = new ServiceRegleImpl(parametreRepository, serviceExigence, serviceAudit);
    }

    @Test
    void lInventaireNeRetientQueLesReglesNonConfirmees() {
        when(parametreRepository.findAll()).thenReturn(List.of(parametre("A_CONFIRMER", "V"), parametre("PROPOSEE", "A"),
                parametre("CONFIRMEE", "C")));
        when(serviceExigence.lister(false)).thenReturn(List.of(exigence("IDENTITE_PIECE", "V"), exigence("CONFIRMEE", "C")));

        var synthese = service.enAttente();

        assertThat(synthese.parametresNonValides()).isEqualTo(1);
        assertThat(synthese.parametresProposes()).isEqualTo(1);
        assertThat(synthese.exigencesNonConfirmees()).isEqualTo(1);
        assertThat(synthese.regles()).extracting(r -> r.cle()).containsExactly("A_CONFIRMER", "PROPOSEE", "IDENTITE_PIECE");
    }

    @Test
    void laValidationPasseLeParametreEnCSansChangerSaValeurEtEstTracee() {
        Parametre p = parametre("DELAI", "V");
        when(parametreRepository.findByCle("DELAI")).thenReturn(Optional.of(p));

        var dto = service.validerParametre("DELAI", "PV COSITI du 01/10/2026", pca);

        assertThat(dto.statutValidation()).isEqualTo("C");
        assertThat(dto.valeur()).isEqualTo("42");
        assertThat(p.estValide()).isTrue();
        verify(serviceAudit).tracer(eq(TypeOperation.REGLE_VALIDATION), eq("parametre"), any(), any(), any(),
                eq("PV COSITI du 01/10/2026"));
    }

    @Test
    void laValidationExigeUnMotif() {
        assertThatThrownBy(() -> service.validerParametre("DELAI", " ", pca))
                .isInstanceOf(ExceptionValidation.class)
                .hasFieldOrPropertyWithValue("code", "REGLE_MOTIF_REQUIS");
    }

    @Test
    void validerUneRegleDejaConfirmeeNeFaitRien() {
        when(parametreRepository.findByCle("DELAI")).thenReturn(Optional.of(parametre("DELAI", "C")));

        service.validerParametre("DELAI", "Rejeu", pca);

        verify(parametreRepository, never()).save(any());
        verify(serviceAudit, never()).tracer(any(), any(), any(), any(), any(), any());
    }

    private static Parametre parametre(String cle, String statut) {
        try {
            var constructeur = Parametre.class.getDeclaredConstructor();
            constructeur.setAccessible(true);
            Parametre p = constructeur.newInstance();
            for (var champ : List.of(new Object[]{"id", UUID.randomUUID()}, new Object[]{"cle", cle},
                    new Object[]{"valeur", "42"}, new Object[]{"typeValeur", "ENTIER"}, new Object[]{"libelle", cle},
                    new Object[]{"modifiableParRole", "SUPER_ADMIN"}, new Object[]{"statutValidation", statut})) {
                Field f = Parametre.class.getDeclaredField((String) champ[0]);
                f.setAccessible(true);
                f.set(p, champ[1]);
            }
            return p;
        } catch (ReflectiveOperationException e) {
            throw new IllegalStateException(e);
        }
    }

    private static ExigenceDocumentaireDto exigence(String code, String statut) {
        return new ExigenceDocumentaireDto(UUID.randomUUID(), code, "IDENTITE", "CNI", null, code,
                NiveauExigence.OBLIGATOIRE, null, true, statut, "C".equals(statut), null, null, true, 1, 0L);
    }
}
