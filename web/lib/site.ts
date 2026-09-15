export const siteName = "Vivadeo";
export const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
export const contactEmail = process.env.NEXT_PUBLIC_CONTACT_EMAIL || "vivadeo@gmail.com";
export const contactLocation = process.env.NEXT_PUBLIC_CONTACT_LOCATION || "Nairobi, Kenya";

export function pageTitle(title: string) {
  return `${title} | ${siteName}`;
}
