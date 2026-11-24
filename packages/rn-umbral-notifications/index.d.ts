export interface NotificationPayload {
  package: string;
  content: string;
  postedAt: number;
}

export interface Subscription {
  remove(): void;
}

export function isAvailable(): boolean;
export function isEnabled(): Promise<boolean>;
export function openSettings(): Promise<void>;
export function addOfferListener(callback: (payload: NotificationPayload) => void): Subscription;
export function addStatusListener(callback: (payload: { enabled: boolean }) => void): Subscription;
