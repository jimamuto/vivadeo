import { notFound } from "next/navigation";
import { SettingsPageContent } from "../settings-page-content";
import { isSettingsSection } from "../settings-sections";

export default async function SettingsSectionPage({ params }: { params: Promise<{ section: string }> }) {
  const { section } = await params;
  if (!isSettingsSection(section)) notFound();
  return <SettingsPageContent section={section} />;
}
