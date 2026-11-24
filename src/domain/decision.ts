import { computeOfferMetrics } from './offer';
import { formatMoney, formatRate } from './money';
import type { Decision, Offer, ShiftSettings, Strategy } from './types';

export function evaluateOffer(
  offer: Offer,
  settings: ShiftSettings,
  strategy: Strategy,
  now: number = Date.now(),
): Decision {
  const metrics = computeOfferMetrics(offer, settings.costPerKm);
  const score = metrics.profitPerHour - strategy.acceptFloor;
  const notes: string[] = [];
  let verdict: Decision['verdict'] = score >= 0 ? 'accept' : 'wait';

  if (metrics.profit <= 0) {
    verdict = 'wait';
    notes.push('No cubre los costos variables: no conviene.');
  } else if (strategy.mode === 'survival' && verdict === 'wait') {
    verdict = 'accept';
    notes.push('Modo supervivencia: suma aunque sea poco.');
  } else if (
    offer.expiresInSec !== undefined &&
    offer.expiresInSec <= 15 &&
    verdict === 'wait'
  ) {
    verdict = 'accept';
    notes.push(`Expira en ${offer.expiresInSec} s y cubre costos: aceptar.`);
  }

  notes.push(
    `${formatRate(metrics.profitPerHour)} netos vs umbral de ${formatRate(strategy.acceptFloor)}.`,
  );
  notes.push(`Ganancia estimada: ${formatMoney(metrics.profit)} en ${offer.durationMin} min.`);

  // `now` se usa para consistencia con el momento de la decisión.
  void now;
  return { verdict, score, metrics, floor: strategy.acceptFloor, notes };
}
