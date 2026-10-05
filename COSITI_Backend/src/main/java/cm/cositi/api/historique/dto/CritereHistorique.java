package cm.cositi.api.historique.dto;

import cm.cositi.api.audit.TypeOperation;
import cm.cositi.api.historique.PeriodeHistorique;

import java.time.LocalDate;
import java.util.Set;

/**
 * Filtres de l'historique : {@code periode} + {@code date} de référence, ou {@code du} / {@code au} (inclus) ;
 * {@code types} et {@code module} restreignent aux événements voulus.
 */
public record CritereHistorique(PeriodeHistorique periode, LocalDate date, LocalDate du, LocalDate au,
                                Set<TypeOperation> types, String module) {
}
