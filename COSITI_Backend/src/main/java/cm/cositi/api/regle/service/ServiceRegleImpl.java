package cm.cositi.api.regle.service;

import cm.cositi.api.adhesion.dto.ExigenceDocumentaireDto;
import cm.cositi.api.adhesion.service.ServiceExigenceDocumentaire;
import cm.cositi.api.administration.dto.ParametreDto;
import cm.cositi.api.audit.ContexteAudit;
import cm.cositi.api.audit.ServiceAudit;
import cm.cositi.api.audit.TypeOperation;
import cm.cositi.api.commun.exception.ExceptionRessourceIntrouvable;
import cm.cositi.api.commun.exception.ExceptionValidation;
import cm.cositi.api.parametre.Parametre;
import cm.cositi.api.parametre.ParametreRepository;
import cm.cositi.api.regle.dto.RegleEnAttenteDto;
import cm.cositi.api.regle.dto.SyntheseReglesDto;
import cm.cositi.api.securite.entite.Utilisateur;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Map;

@Service
public class ServiceRegleImpl implements ServiceRegle {

    private final ParametreRepository parametreRepository;
    private final ServiceExigenceDocumentaire serviceExigence;
    private final ServiceAudit serviceAudit;

    public ServiceRegleImpl(ParametreRepository parametreRepository, ServiceExigenceDocumentaire serviceExigence,
                            ServiceAudit serviceAudit) {
        this.parametreRepository = parametreRepository;
        this.serviceExigence = serviceExigence;
        this.serviceAudit = serviceAudit;
    }

    @Override
    @PreAuthorize("hasAnyAuthority('ADMINISTRATION:LIRE', 'REGLE:VALIDER')")
    @Transactional(readOnly = true)
    public SyntheseReglesDto enAttente() {
        // V d'abord (non validé), puis A (proposition technique).
        List<Parametre> parametres = parametreRepository.findAll().stream()
                .filter(p -> !"C".equalsIgnoreCase(p.getStatutValidation()))
                .sorted(Comparator.comparing(Parametre::getStatutValidation).reversed().thenComparing(Parametre::getCle))
                .toList();
        List<ExigenceDocumentaireDto> exigences = serviceExigence.lister(false).stream()
                .filter(e -> !"C".equalsIgnoreCase(e.statutValidation()))
                .toList();

        List<RegleEnAttenteDto> regles = new ArrayList<>();
        parametres.forEach(p -> regles.add(new RegleEnAttenteDto("PARAMETRE", p.getId(), p.getCle(), p.getLibelle(),
                p.getValeur(), p.getStatutValidation(), p.getModifieLe(), p.getModifiePar())));
        exigences.forEach(e -> regles.add(new RegleEnAttenteDto("EXIGENCE_DOCUMENTAIRE", e.id(), e.code(), e.libelle(),
                e.niveau().name(), e.statutValidation(), null, null)));

        long nonValides = parametres.stream().filter(p -> "V".equalsIgnoreCase(p.getStatutValidation())).count();
        return new SyntheseReglesDto(nonValides, parametres.size() - nonValides, exigences.size(), regles);
    }

    @Override
    @PreAuthorize("hasAuthority('REGLE:VALIDER')")
    @Transactional
    public ParametreDto validerParametre(String cle, String motif, Utilisateur auteur) {
        if (motif == null || motif.isBlank()) {
            throw new ExceptionValidation("REGLE_MOTIF_REQUIS", "Le motif (référence de la décision COSITI) est obligatoire.", "motif");
        }
        Parametre parametre = parametreRepository.findByCle(cle).orElseThrow(() ->
                new ExceptionRessourceIntrouvable("PARAMETRE_INTROUVABLE", "Paramètre introuvable : " + cle));
        if ("C".equalsIgnoreCase(parametre.getStatutValidation())) {
            return ParametreDto.depuis(parametre);
        }
        String avant = parametre.getStatutValidation();
        parametre.confirmer(auteur.getIdentifiant());
        parametreRepository.save(parametre);
        serviceAudit.tracer(TypeOperation.REGLE_VALIDATION, "parametre", parametre.getId(),
                Map.of("statutValidation", avant, "valeur", parametre.getValeur()),
                ContexteAudit.avec(auteur, Map.of("cle", cle, "statutValidation", "C", "valeur", parametre.getValeur())),
                motif.trim());
        return ParametreDto.depuis(parametre);
    }
}
