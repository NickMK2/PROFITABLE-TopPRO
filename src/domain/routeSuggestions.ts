import type { RankedFlow } from './publicFlows';
import type { RouteSuggestion } from './routeTrials';
import type { RoutePlanItem } from './routes';

/**
 * Convierte el plan de clientes y las señales públicas en candidatos a probar.
 * No inventa datos: solo reformula lo que la app ya tiene con consentimiento o fuente pública.
 */
export function suggestRoutes(
  items: RoutePlanItem[],
  flows: RankedFlow[],
  limit = 4,
): RouteSuggestion[] {
  const suggestions: RouteSuggestion[] = [];
  const customerLimit = Math.ceil(limit / 2);

  for (const item of [...items].sort((a, b) => b.priority - a.priority).slice(0, customerLimit)) {
    const customer = item.customer;
    const windowLabel = `${item.daysLabel}${customer.pickupTime ? ` ${customer.pickupTime}` : ''}`;
    suggestions.push({
      id: `cliente:${customer.id}`,
      title: `${customer.origin ?? 'Origen sin definir'} → ${customer.destination ?? 'Destino sin definir'}`,
      zone: customer.origin ?? customer.zones ?? '',
      windowLabel,
      reason: `Recogida habitual de ${customer.alias}. ${item.reasons[0] ?? 'Patrón semanal'}`,
      kind: 'cliente',
    });
  }

  for (const ranked of flows.slice(0, limit - suggestions.length)) {
    const { flow, next, zoneMatch } = ranked;
    suggestions.push({
      id: `senal:${flow.id}`,
      title: flow.name,
      zone: flow.zone,
      windowLabel: next?.label ?? 'Sin franja fija',
      reason: `${zoneMatch ? 'Cerca de tu zona. ' : ''}${flow.insight}`,
      kind: 'señal pública',
    });
  }

  return suggestions.slice(0, limit);
}
