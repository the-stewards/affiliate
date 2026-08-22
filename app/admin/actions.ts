"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { sql } from "@/lib/db";
import { RESERVED_SLUGS, isValidSlugFormat } from "@/lib/slug";
import { isValidEmail } from "@/lib/validate";

export async function addRootAffiliate(formData: FormData) {
  const name = String(formData.get("name") || "").trim();
  const email = String(formData.get("email") || "").trim().toLowerCase();
  const phone = String(formData.get("phone") || "").trim();
  const slug = String(formData.get("slug") || "").trim().toLowerCase();

  if (!name || !email || !slug) {
    redirect("/admin?error=" + encodeURIComponent("Name, email, and slug are required."));
  }
  if (!isValidEmail(email)) {
    redirect("/admin?error=" + encodeURIComponent("Please enter a valid email address."));
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

  revalidatePath("/admin");
  redirect("/admin?success=" + encodeURIComponent(`Added ${name} (/${slug}).`));
}

export async function setLeaderboardVisibility(formData: FormData) {
  const slug = String(formData.get("slug") || "").trim().toLowerCase();
  const hidden = formData.get("hidden") === "true";

  await sql`
    update affiliates set hidden_from_leaderboard = ${hidden} where lower(slug) = ${slug}
  `;

  revalidatePath("/admin");
  revalidatePath(`/admin/${slug}`);
  redirect(`/admin/${slug}?success=` + encodeURIComponent(hidden ? "Hidden from the leaderboard." : "Now visible on the leaderboard."));
}

export async function deleteAffiliate(formData: FormData) {
  const slug = String(formData.get("slug") || "").trim().toLowerCase();

  const rows = await sql`
    select a.id,
      (select count(*)::int from rsvps r where r.affiliate_id = a.id) as rsvp_count,
      (select count(*)::int from affiliates ref where ref.referred_by_id = a.id) as referred_count
    from affiliates a
    where lower(a.slug) = ${slug}
  `;
  const row = rows[0];
  if (!row) {
    redirect("/admin?error=" + encodeURIComponent("Affiliate not found."));
  }
  if (row.rsvp_count > 0 || row.referred_count > 0) {
    redirect(
      `/admin/${slug}?error=` +
        encodeURIComponent(
          `Can't delete — this affiliate has ${row.rsvp_count} RSVP(s) and referred ${row.referred_count} affiliate(s). Hide them from the leaderboard instead.`
        )
    );
  }

  await sql`delete from affiliates where id = ${row.id}`;

  revalidatePath("/admin");
  redirect("/admin?success=" + encodeURIComponent(`Deleted /${slug}.`));
}
