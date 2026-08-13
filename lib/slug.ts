// Routes and words a new affiliate can never claim as their slug, so they
// can't accidentally (or deliberately) shadow a real page in the app.
export const RESERVED_SLUGS = new Set([
  "leaderboard",
  "admin",
  "api",
  "join",
  "rsvp",
  "affiliate",
  "affiliates",
  "login",
  "signup",
  "about",
  "privacy",
  "terms",
  "_next",
  "favicon.ico",
  "robots.txt",
  "sitemap.xml",
]);

// "Ember Johnson" -> "emberj". Lowercase, alphanumeric only.
export function baseSlugFromName(fullName: string): string {
  const parts = fullName.trim().toLowerCase().split(/\s+/).filter(Boolean);
  const first = (parts[0] || "").replace(/[^a-z0-9]/g, "");
  const lastInitial = (parts[1] || "").replace(/[^a-z0-9]/g, "").slice(0, 1);
  const base = `${first}${lastInitial}`;
  return base || "affiliate";
}

export function isValidSlugFormat(slug: string): boolean {
  return /^[a-z0-9-]{2,40}$/.test(slug);
}
