import type { Offer } from '../domain/types';
import type { ParsedOffer } from '../ingest/notificationParser';

export interface Candidate {
  offer: Offer;
  parsed: ParsedOffer;
  /** true si la oferta ya fue contada para estimar demanda. */
  counted: boolean;
}
