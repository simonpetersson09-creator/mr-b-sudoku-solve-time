export type AdPlatform = 'ios' | 'android';
export const SAMPLE_APP_IDS: Record<AdPlatform, string>;
export function configuredAppId(source: string, platform: AdPlatform): string | null;
export function selectAppId(platform: AdPlatform, configured: string | null, existing: string | undefined): string;