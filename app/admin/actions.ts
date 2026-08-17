"use server";

import { redirect } from "next/navigation";
import { sql } from "@/lib/db";
import { RESERVED_SLUGS, isValidSlugFormat } from "@/lib/slug";

export async function addRootAffiliate(formData: FormData) {
  const name = String(formData.get("name") || "").trim();
  const email = String(formData.get("email") || "").trim().toLowerCase();
  const phone = String(formData.get("phone") || "").trim();
  const slug = String(formData.get("slug") || "").trim().toLowerCase();

  if (!name || !email || !slug) {
    redirect("/admin?error=" + encodeURIComponent("Name, email, and slug are required."));
  }
  if (!isValidSlugFormat(slug)) {
    redirect(
      "/admin?error=" + encodeURIComponent("Slug must be 2-40 characters: lowercase letters, numbers, hyphens.")
    );
  }
  if (RESERVED_SLUGS.has(slug)) {
    redirect("/admin?error=" + encodeURIComponent("That slug is reserved."));
  }

  try {
    await sql`
      insert into affiliates (slug, display_name, email, phone)
      values (${slug}, ${name}, ${email}, ${phone || null})
    `;
  } catch (err: any) {
    const msg = String(err?.message || "");
    if (msg.includes("affiliates_slug_lower_idx")) {
      redirect("/admin?error=" + encodeURIComponent("That slug is already taken."));
    }
    if (msg.includes("affiliates_email_lower_idx")) {
      redirect("/admin?error=" + encodeURIComponent("That email is already registered as an affiliate."));
    }
    console.error(err);
    redirect("/admin?error=" + encodeURIComponent("Something went wrong. Try again."));
  }

  redirect("/admin?success=" + encodeURIComponent(`Added ${name} (/${slug}).`));
}
