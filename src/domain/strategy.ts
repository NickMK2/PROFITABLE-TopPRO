import { clamp, formatMoney, formatRate } from './money';
import type { ShiftMode, ShiftSettings, Strategy } from './types';

/**
 * Calcula el umbral de aceptación para este momento del día.
 *
 * Tres palancas:
 *  1. Meta: dinero que falta / horas productivas que quedan => requiredRate.
 *  2. Demanda: si hay muchas ofertas, sube el umbral; si hay pocas, baja.
 *  3. Urgencia: si vas detrás del ritmo, baja el umbral; si vas adelante, súbelo.
 *
 * En el último tramo con poco progreso entra "supervivencia": se acepta
 * cualquier viaje que cubra costos, aunque no sea de los mejores.
 */
export function computeStrategy(
  settings: ShiftSettings,
  earned: number,
  now: number = Date.now(),
): Strategy {
  const shiftMs = Math.max(1, settings.shiftEnd - settings.shiftStart);
  const shiftHours = shiftMs / 3_600_000;
  const elapsedHours = clamp((now - settings.shiftStart) / 3_600_000, 0, shiftHours);
  const remainingHours = clamp((settings.shiftEnd - now) / 3_600_000, 0.1, shiftHours);

  const paidHours = Math.max(0.1, remainingHours * clamp(settings.utilization, 0.2, 1));
  const remainingGoal = Math.max(0, settings.goal - earned);
  const requiredRate = remainingGoal / paidHours;

  const expectedEarned = settings.goal * (elapsedHours / shiftHours);
  const progressRatio = earned / Math.max(1, expectedEarned);

  const reference = Math.max(1, settings.referenceOffersPerHour);
  const demandFactor = clamp(
    1 + ((settings.offersPerHour - reference) / reference) * 0.2,
    0.85,
    1.25,
  );
  const urgencyFactor = clamp(progressRatio, 0.7, 1.3);

  let mode: ShiftMode = 'normal';
  if (remainingHours <= 2 && progressRatio < 0.9) mode = 'survival';
  else if (progressRatio < 0.95) mode = 'urge';

  const hard = Math.max(0, settings.hardFloorRate);
  let acceptFloor: number;
  if (mode === 'survival') {
    acceptFloor = Math.max(hard, settings.reserveRate * 0.55);
  } else {
    // La meta empuja el umbral, pero con tope: si vas rezagado conviene
    // bajar el listón y aceptar antes que quedarte sin carreras.
    const goalFactor = clamp(requiredRate / Math.max(1, settings.reserveRate), 0.8, 1.35);
    const base = settings.reserveRate * goalFactor * urgencyFactor * demandFactor;
    acceptFloor = clamp(base, hard, Math.max(settings.reserveRate * 1.8, hard + 1));
  }

  const reasons: string[] = [];
  reasons.push(`Te faltan ${formatMoney(remainingGoal)} en ${remainingHours.toFixed(1)} h (${paidHours.toFixed(1)} h productivas).`);
  if (demandFactor < 1) reasons.push('Hay pocas ofertas: bajo el listón para no quedar parado.');
  else if (demandFactor > 1) reasons.push('Hay demanda: puedo esperar una mejor oferta.');

  if (urgencyFactor < 1) reasons.push('Vas detrás del ritmo del día: acepto más rápido.');
  else if (urgencyFactor > 1) reasons.push('Vas adelante: puedo exigir más.');

  if (mode === 'survival') {
    reasons.push('Modo supervivencia: acepto lo que cubra costos para no perder el día.');
  }
  reasons.push(`Umbral ahora: ${formatRate(acceptFloor)} de ganancia neta.`);

  return {
    requiredRate,
    acceptFloor,
    demandFactor,
    urgencyFactor,
    progressRatio,
    remainingHours,
    remainingGoal,
    mode,
    reasons,
  };
}
