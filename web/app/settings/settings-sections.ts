export const SETTINGS_SECTIONS = [
  { slug: "account", label: "Account" },
  { slug: "security", label: "Security" },
  { slug: "privacy", label: "Data & privacy" },
  { slug: "ai-providers", label: "AI providers" },
] as const;

export type SettingsSection = (typeof SETTINGS_SECTIONS)[number]["slug"];

export function isSettingsSection(value: string): value is SettingsSection {
  return SETTINGS_SECTIONS.some((section) => section.slug === value);
}

export function getSettingsSectionLabel(value: string) {
  return SETTINGS_SECTIONS.find((section) => section.slug === value)?.label;
}
