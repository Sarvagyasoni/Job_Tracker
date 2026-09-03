export const FEATURES = {
  profile: true,
} as const;

export type FeatureFlag = keyof typeof FEATURES;

export function isFeatureEnabled(feature: FeatureFlag): boolean {
  return FEATURES[feature] === true;
}
