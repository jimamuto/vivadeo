import { redirect } from "next/navigation";

export default async function SettingsPage({ searchParams }: { searchParams: Promise<{ verify?: string }> }) {
  const { verify } = await searchParams;
  redirect(verify ? `/settings/account?verify=${encodeURIComponent(verify)}` : "/settings/account");
}
