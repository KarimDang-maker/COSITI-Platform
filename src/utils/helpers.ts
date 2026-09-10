import {
  Adherent,
  Alerte,
  Cotisation,
  DossierAllocations,
  ParametresApp,
  StatutCotisation,
} from '../types';

export function formatFCFA(amount: number): string {
  return new Intl.NumberFormat('fr-FR', {
    style: 'decimal',
    maximumFractionDigits: 0,
  }).format(amount) + ' FCFA';
}

export function formatDateFr(dateStr?: string): string {
  if (!dateStr) return '—';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return new Intl.DateTimeFormat('fr-FR', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    }).format(d);
  } catch {
    return dateStr;
  }
}

export function formatDateShort(dateStr?: string): string {
  if (!dateStr) return '—';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return new Intl.DateTimeFormat('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    }).format(d);
  } catch {
    return dateStr;
  }
}

/**
 * Calcule les statistiques d'un adhérent
 */
export function calculateAdherentStats(
  adherent: Adherent,
  allCotisations: Cotisation[],
  parametres: ParametresApp,
  currentDate = new Date()
) {
  const memberCotisations = allCotisations
    .filter((c) => c.adherentId === adherent.id || c.matricule === adherent.matricule)
    .sort((a, b) => new Date(b.datePaiement).getTime() - new Date(a.datePaiement).getTime());

  const totalCumule = memberCotisations.reduce((acc, c) => acc + c.montant, 0);

  const curMonth = currentDate.getMonth();
  const curYear = currentDate.getFullYear();
  const curDay = currentDate.toISOString().slice(0, 10);

  const totalCeMois = memberCotisations
    .filter((c) => {
      const d = new Date(c.datePaiement);
      return d.getMonth() === curMonth && d.getFullYear() === curYear;
    })
    .reduce((acc, c) => acc + c.montant, 0);

  const totalCetteAnnee = memberCotisations
    .filter((c) => {
      const d = new Date(c.datePaiement);
      return d.getFullYear() === curYear;
    })
    .reduce((acc, c) => acc + c.montant, 0);

  const totalAujourdhui = memberCotisations
    .filter((c) => c.datePaiement === curDay)
    .reduce((acc, c) => acc + c.montant, 0);

  const dernierPaiement = memberCotisations[0];
  const nombreVersements = memberCotisations.length;

  // Calcul du nombre de jours couverts (selon tarif journalier de l'adhérent)
  const tarifJournalier = adherent.tarifJournalier || 700;
  const nombreJoursCotises = Math.floor(totalCumule / tarifJournalier);

  // Règle métier : les jours de retard se calculent mensuellement sur une base standard de 30 jours
  // et se réactualisent pour les 30 prochains jours du mois nouvellement engagé.
  const CYCLE_MENSUEL = 30;

  // Jour écoulé dans le mois nouvellement engagé (plafonné à 30 jours)
  const jourMoisEngage = Math.min(CYCLE_MENSUEL, Math.max(1, currentDate.getDate()));

  // Nombre de jours cotisés spécifiquement pour le mois en cours engagé (plafonné à 30)
  const joursCotisesCeMois = Math.min(CYCLE_MENSUEL, Math.floor(totalCeMois / tarifJournalier));

  // Retard pour le cycle mensuel de 30 jours en cours
  const retardMoisEngage = Math.max(0, jourMoisEngage - joursCotisesCeMois);

  // Calcul du décalage avec les mois antérieurs écoulés depuis l'adhésion
  let dateDebut = new Date(adherent.dateAdhesion);
  if (isNaN(dateDebut.getTime())) {
    dateDebut = new Date(curYear, curMonth, 1);
  }

  const diffAnnees = curYear - dateDebut.getFullYear();
  const diffMois = curMonth - dateDebut.getMonth() + diffAnnees * 12;
  const moisCompletsAnterieurs = Math.max(0, diffMois);

  // Jours exigibles (30 jours par cycle mensuel antérieur + jours échus du mois nouvellement engagé)
  const joursDusTotal = (moisCompletsAnterieurs * CYCLE_MENSUEL) + jourMoisEngage;

  // Calcul effectif des jours de retard réactualisé
  let joursRetard = 0;
  let statutCotisation: StatutCotisation = 'Sans cotisation';

  if (memberCotisations.length === 0) {
    statutCotisation = 'Sans cotisation';
    // Si aucun versement, le retard pour le mois engagé est au moins égal aux jours échus du mois (sur 30)
    joursRetard = Math.min(CYCLE_MENSUEL, jourMoisEngage);
    if (moisCompletsAnterieurs > 0) {
      joursRetard = Math.max(joursRetard, Math.min(CYCLE_MENSUEL, joursDusTotal));
    }
  } else {
    // Si l'adhérent a cotisé ce mois-ci suffisamment pour couvrir les jours échus du mois
    if (joursCotisesCeMois >= jourMoisEngage) {
      statutCotisation = 'À jour';
      joursRetard = 0;
    } else {
      // Retard calculé sur le cycle mensuel réactualisé pour le mois nouvellement engagé
      joursRetard = Math.max(0, retardMoisEngage);
      
      // Si l'adhérent est en retard de plus du seuil d'alerte configuré ou a un arriéré
      if (joursRetard > (parametres.seuilJoursRetardAlerte || 10) || (joursRetard > 0 && joursCotisesCeMois === 0)) {
        statutCotisation = 'En retard';
      } else if (joursRetard === 0) {
        statutCotisation = 'À jour';
      } else {
        // Dans la marge de tolérance avant alerte
        statutCotisation = 'En retard';
      }
    }
  }

  // Seuil immatriculation
  const seuil = parametres.seuilImmatriculation || 15000;
  const seuilAtteint = totalCumule >= seuil;
  const montantRestantPourSeuil = Math.max(0, seuil - totalCumule);
  const pourcentageSeuil = Math.min(100, Math.round((totalCumule / seuil) * 100));
  const montantRetard = joursRetard * (adherent.tarifJournalier || 700);

  return {
    totalCumule,
    totalCeMois,
    totalCetteAnnee,
    totalAujourdhui,
    dernierPaiement,
    nombreVersements,
    nombreJoursCotises,
    statutCotisation,
    joursRetard,
    montantRetard,
    joursCotisesCeMois,
    retardMoisEngage,
    jourMoisEngage,
    seuilAtteint,
    montantRestantPourSeuil,
    pourcentageSeuil,
  };
}

/**
 * Générateur intelligent d'alertes conforme aux spécifications
 */
export function generateAlerts(
  adherents: Adherent[],
  cotisations: Cotisation[],
  dossiers: DossierAllocations[],
  parametres: ParametresApp,
  referenceDate = new Date()
): Alerte[] {
  const alerts: Alerte[] = [];
  const seuil = parametres.seuilImmatriculation || 15000;
  const curDayOfMonth = referenceDate.getDate();

  adherents.forEach((adh) => {
    const stats = calculateAdherentStats(adh, cotisations, parametres, referenceDate);

    // Règle A : Alerte des adhérents non à jour de leurs cotisations
    if (adh.statut === 'Actif' && (stats.statutCotisation === 'En retard' || stats.statutCotisation === 'Sans cotisation')) {
      const isSansCotisation = stats.statutCotisation === 'Sans cotisation';
      alerts.push({
        id: `alert-retard-${adh.id}`,
        type: 'NON_A_JOUR',
        titre: `Adhérent non à jour : ${adh.nom} ${adh.prenom}`,
        message: isSansCotisation
          ? `Attention : ${adh.matricule} n'a effectué aucun versement depuis son adhésion (${stats.joursRetard} jours de retard).`
          : `Attention : cet adhérent n’est pas à jour de ses cotisations (dernier versement il y a ${stats.joursRetard} jours).`,
        adherentId: adh.id,
        matricule: adh.matricule,
        nomAdherent: `${adh.nom} ${adh.prenom}`,
        dateDeclenchement: referenceDate.toISOString(),
        niveau: stats.joursRetard > 25 ? 'urgent' : 'warning',
        details: {
          dernierPaiement: stats.dernierPaiement ? stats.dernierPaiement.datePaiement : 'Aucun',
          montantCumule: stats.totalCumule,
          montantRestant: Math.max(0, adh.tarifJournalier * 30 - stats.totalCeMois),
          joursRetard: stats.joursRetard,
        },
      });
    }

    // Règle B : Alerte d'immatriculation après 15 000 FCFA
    if (stats.seuilAtteint && adh.statutImmatriculation !== 'Immatriculé') {
      alerts.push({
        id: `alert-seuil-${adh.id}`,
        type: 'SEUIL_15000_ATTEINT',
        titre: `Seuil 15 000 FCFA atteint : ${adh.matricule}`,
        message: `Alerte immatriculation : l'adhérent ${adh.matricule} (${adh.nom} ${adh.prenom}) a atteint ${formatFCFA(stats.totalCumule)} de cotisations. Veuillez procéder à son immatriculation CNPS.`,
        adherentId: adh.id,
        matricule: adh.matricule,
        nomAdherent: `${adh.nom} ${adh.prenom}`,
        dateDeclenchement: referenceDate.toISOString(),
        niveau: 'urgent',
        details: {
          montantCumule: stats.totalCumule,
          statutImmatriculation: adh.statutImmatriculation,
          dateSeuilAtteint: stats.dernierPaiement?.datePaiement || adh.dateAdhesion,
        },
      });
    }

    // Règle C : Règle de vérification au 15 et au 30 du mois
    // Vérification basée sur le total réel des cotisations
    const isVerificationDay =
      curDayOfMonth === 15 || curDayOfMonth === 30 || curDayOfMonth === 31 || curDayOfMonth === 28;
    if (stats.totalCumule >= seuil && adh.statutImmatriculation !== 'Immatriculé') {
      alerts.push({
        id: `alert-verif1530-${adh.id}`,
        type: 'VERIFICATION_15_30',
        titre: `Vérification périodique (Cycle 15/30) : ${adh.matricule}`,
        message: `Alerte : cet adhérent a atteint le seuil de cotisation requis (${formatFCFA(stats.totalCumule)}) et doit être immatriculé.`,
        adherentId: adh.id,
        matricule: adh.matricule,
        nomAdherent: `${adh.nom} ${adh.prenom}`,
        dateDeclenchement: referenceDate.toISOString(),
        niveau: 'urgent',
        details: {
          montantCumule: stats.totalCumule,
          isCycle15or30: isVerificationDay,
        },
      });
    }

    // Règle D : Alerte pour les adhérents déjà immatriculés qui doivent constituer leur dossier d'allocations
    if (adh.statutImmatriculation === 'Immatriculé') {
      const dossier = dossiers.find((d) => d.adherentId === adh.id || d.matricule === adh.matricule);
      if (!dossier || dossier.statut !== 'Dossier complet' && dossier.statut !== 'Dossier transmis' && dossier.statut !== 'Dossier traité') {
        const piecesManquantes = dossier
          ? dossier.pieces.filter((p) => p.obligatoire && !p.recu).map((p) => p.nom)
          : ['Dossier non encore créé'];

        alerts.push({
          id: `alert-dossier-${adh.id}`,
          type: 'DOSSIER_ALLOCATIONS',
          titre: `Dossier allocations familiales : ${adh.nom} ${adh.prenom}`,
          message: `Dossier d’allocations familiales à constituer : cet adhérent est immatriculé (${adh.numeroCnps || 'CNPS en attente'}) et doit compléter son dossier.`,
          adherentId: adh.id,
          matricule: adh.matricule,
          nomAdherent: `${adh.nom} ${adh.prenom}`,
          dateDeclenchement: referenceDate.toISOString(),
          niveau: 'warning',
          details: {
            statutImmatriculation: adh.statutImmatriculation,
            piecesManquantes,
          },
        });
      }
    }
  });

  return alerts;
}

/**
 * Génère le prochain matricule unique avec le format COSITI-0001
 */
export function generateNextMatricule(derniereSequence: number): { matricule: string; sequence: number } {
  const nextSeq = (derniereSequence || 0) + 1;
  const padded = String(nextSeq).padStart(4, '0');
  return {
    matricule: `COSITI-${padded}`,
    sequence: nextSeq,
  };
}
