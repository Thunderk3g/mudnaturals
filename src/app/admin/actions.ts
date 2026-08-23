"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { z } from "zod";
import { passwordMatches, startSession, endSession, requireSession } from "@/lib/admin-auth";
import { rupeesToPaisa } from "@/lib/money";
import * as admin from "@/server/admin";
import { run, text, optional, number, flag } from "./plumbing";
import type { ActionState } from "./ui";

/**
 * Every admin mutation in the system. Middleware is only the outer gate, so
 * each action re-verifies the session itself before it validates input or
 * touches the database — see `run` in ./plumbing.
 */

const uuid = z.string().uuid("That record id is not valid.");
const slug = z
  .string()
  .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, "Slug must be lowercase words separated by hyphens.");

/* ------------------------------------------------------------------ auth */

export async function loginAction(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const password = text(fd, "password");
  const next = text(fd, "next");

  // Never logged, never echoed back.
  if (!password || !passwordMatches(password)) {
    return { error: "That password is not right." };
  }

  await startSession();
  // Only ever bounce back into the console — an attacker-supplied `next` must
  // not turn the login form into an open redirect.
  redirect(next.startsWith("/admin") && !next.startsWith("//") ? next : "/admin");
}

export async function logoutAction(): Promise<void> {
  await endSession();
  redirect("/admin/login");
}

/* ---------------------------------------------------------------- orders */

export async function advanceStatusAction(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const orderId = text(fd, "order_id");
  const to = text(fd, "to");

  return run([`/admin/orders/${orderId}`, "/admin/orders", "/admin"], async () => {
    uuid.parse(orderId);
    if (!to) throw new Error("Pick a status to move to.");

    if (to === "shipped") {
      const ship = z
        .object({
          carrier: z.string().min(1, "Carrier is required to ship an order."),
          trackingRef: z.string().min(1, "Tracking reference is required to ship an order."),
        })
        .parse({ carrier: text(fd, "carrier"), trackingRef: text(fd, "tracking_ref") });
      await admin.advanceOrderStatus(orderId, to, ship);
      return `Marked shipped with ${ship.carrier}.`;
    }

    await admin.advanceOrderStatus(orderId, to);
    return `Moved to ${to.replace(/_/g, " ")}.`;
  });
}

export async function cancelOrderAction(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const orderId = text(fd, "order_id");
  return run([`/admin/orders/${orderId}`, "/admin/orders", "/admin"], async () => {
    uuid.parse(orderId);
    const reason = z
      .string()
      .min(3, "Give a cancellation reason — it goes on the order timeline.")
      .parse(text(fd, "reason"));
    await admin.cancelOrder(orderId, reason);
    return "Order cancelled.";
  });
}

export async function recordRefundAction(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const orderId = text(fd, "order_id");
  return run([`/admin/orders/${orderId}`, "/admin/orders"], async () => {
    uuid.parse(orderId);
    const parsed = z
      .object({
        amountRupees: z.number().positive("Refund amount must be greater than zero."),
        status: z.enum(["requested", "approved", "completed", "rejected"]),
      })
      .parse({ amountRupees: number(fd, "amount_rupees") ?? 0, status: text(fd, "status") });

    await admin.recordRefund({
      orderId,
      amountPaisa: rupeesToPaisa(parsed.amountRupees),
      reason: optional(fd, "reason"),
      externalReference: optional(fd, "external_reference"),
      restock: flag(fd, "restock"),
      status: parsed.status,
    });
    return "Refund recorded.";
  });
}

/* ------------------------------------------------------------------- COD */

export async function confirmCodAction(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const orderId = text(fd, "order_id");
  return run(["/admin/orders/cod", `/admin/orders/${orderId}`, "/admin"], async () => {
    uuid.parse(orderId);
    await admin.confirmCod(orderId);
    return "Confirmed by phone. This order can now be packed.";
  });
}

export async function recordRefusalAction(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const orderId = text(fd, "order_id");
  return run(["/admin/orders/cod", `/admin/orders/${orderId}`, "/admin"], async () => {
    uuid.parse(orderId);
    await admin.recordCodRefusal(orderId);
    return "Refusal recorded against the customer.";
  });
}

/* --------------------------------------------------------- reconciliation */

export async function reconcileNowAction(_prev: ActionState, _fd: FormData): Promise<ActionState> {
  await requireSession();
  try {
    const secret = process.env.CRON_SECRET;
    if (!secret) return { error: "CRON_SECRET is not set, so reconciliation cannot be triggered." };

    const head = await headers();
    const host = head.get("host");
    const base = host
      ? `${head.get("x-forwarded-proto") ?? "http"}://${host}`
      : (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000");

    const response = await fetch(`${base}/api/cron/reconcile-payments`, {
      method: "POST",
      headers: { authorization: `Bearer ${secret}` },
      cache: "no-store",
    });
    const body = (await response.text()).slice(0, 300);
    if (!response.ok) return { error: `Reconciliation returned ${response.status}. ${body}` };

    revalidatePath("/admin/orders/reconciliation");
    revalidatePath("/admin");
    return { ok: `Reconciliation ran. ${body}` };
  } catch (error) {
    return { error: admin.humanError(error) };
  }
}

/* -------------------------------------------------------------- products */

export async function saveProductAction(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const productId = optional(fd, "product_id");

  return run(["/admin/products", productId ? `/admin/products/${productId}` : "/admin/products"], async () => {
    const parsed = z
      .object({
        slug,
        name: z.string().min(1, "Name is required."),
        categoryId: uuid,
        priceRupees: z.number().positive("Price must be greater than zero."),
        status: z.enum(["draft", "published", "archived"]),
      })
      .parse({
        slug: text(fd, "slug"),
        name: text(fd, "name"),
        categoryId: text(fd, "category_id"),
        priceRupees: number(fd, "price_rupees") ?? 0,
        status: text(fd, "status"),
      });

    const keys = fd.getAll("variant_key").map(String);
    const skus = fd.getAll("variant_sku").map(String);
    const optionNames = fd.getAll("variant_option_name").map(String);
    const optionValues = fd.getAll("variant_option_value").map(String);
    const prices = fd.getAll("variant_price").map(String);

    const variants = keys.map((key, i) => ({
      key,
      id: key.startsWith("new-") ? null : key,
      sku: (skus[i] ?? "").trim(),
      optionName: (optionNames[i] ?? "").trim() || null,
      optionValue: (optionValues[i] ?? "").trim() || null,
      pricePaisa: (prices[i] ?? "").trim() === "" ? null : rupeesToPaisa(Number(prices[i])),
      remove: fd.get(`variant_remove_${key}`) != null,
    }));

    const compareAt = number(fd, "compare_at_rupees");
    const makerShare = number(fd, "maker_share_rupees");

    const savedId = await admin.saveProduct({
      id: productId,
      slug: parsed.slug,
      name: parsed.name,
      subtitle: optional(fd, "subtitle"),
      description: optional(fd, "description"),
      care: optional(fd, "care"),
      categoryId: parsed.categoryId,
      makerId: optional(fd, "maker_id"),
      communityId: optional(fd, "community_id"),
      materialId: optional(fd, "material_id"),
      techniqueId: optional(fd, "technique_id"),
      labourHours: number(fd, "labour_hours"),
      pricePaisa: rupeesToPaisa(parsed.priceRupees),
      compareAtPaisa: compareAt == null ? null : rupeesToPaisa(compareAt),
      // Left null unless the operator supplies it — the storefront hides the
      // impact module while it is null rather than printing a placeholder.
      makerSharePaisa: makerShare == null ? null : rupeesToPaisa(makerShare),
      variationNote: optional(fd, "variation_note"),
      isFood: flag(fd, "is_food"),
      status: parsed.status,
      variants,
      defaultVariantKey: optional(fd, "default_variant"),
    });

    if (!productId) redirect(`/admin/products/${savedId}`);
    return "Product saved.";
  });
}

/* ----------------------------------------------------------------- stock */

export async function recordIntakeAction(_prev: ActionState, fd: FormData): Promise<ActionState> {
  return run(["/admin/stock", "/admin/products", "/admin"], async () => {
    const parsed = z
      .object({
        variantId: uuid,
        makerId: uuid,
        communityId: uuid,
        quantity: z.number().int().positive("Quantity must be a whole number above zero."),
        unitCostRupees: z.number().positive("Unit cost must be greater than zero."),
      })
      .parse({
        variantId: text(fd, "variant_id"),
        makerId: text(fd, "maker_id"),
        communityId: text(fd, "community_id"),
        quantity: number(fd, "quantity") ?? 0,
        unitCostRupees: number(fd, "unit_cost_rupees") ?? 0,
      });

    await admin.recordIntake({
      variantId: parsed.variantId,
      makerId: parsed.makerId,
      communityId: parsed.communityId,
      quantity: parsed.quantity,
      unitCostPaisa: rupeesToPaisa(parsed.unitCostRupees),
      batchRef: optional(fd, "batch_ref"),
    });
    return `Intake recorded: ${parsed.quantity} units.`;
  });
}

/* ------------------------------------------------- makers & communities */

export async function saveMakerAction(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const makerId = optional(fd, "maker_id");
  return run(["/admin/makers", makerId ? `/admin/makers/${makerId}` : "/admin/makers"], async () => {
    const parsed = z
      .object({
        slug,
        displayName: z.string().min(1, "Display name is required."),
        communityId: uuid,
        status: z.enum(["draft", "published", "archived"]),
      })
      .parse({
        slug: text(fd, "slug"),
        displayName: text(fd, "display_name"),
        communityId: text(fd, "community_id"),
        status: text(fd, "status"),
      });

    const savedId = await admin.saveMaker({
      id: makerId,
      slug: parsed.slug,
      displayName: parsed.displayName,
      communityId: parsed.communityId,
      craft: optional(fd, "craft"),
      bio: optional(fd, "bio"),
      quote: optional(fd, "quote"),
      portraitImage: optional(fd, "portrait_image"),
      workingSince: number(fd, "working_since"),
      status: parsed.status,
    });

    if (!makerId) redirect(`/admin/makers/${savedId}`);
    return "Maker saved.";
  });
}

export async function grantConsentAction(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const makerId = text(fd, "maker_id");
  return run([`/admin/makers/${makerId}`, "/admin/makers"], async () => {
    const parsed = z
      .object({
        makerId: uuid,
        scope: z.enum(["name", "portrait", "quote", "video"]),
        grantedAt: z.string().min(1, "Consent needs the date it was signed."),
      })
      .parse({ makerId, scope: text(fd, "scope"), grantedAt: text(fd, "granted_at") });

    await admin.grantConsent({
      makerId: parsed.makerId,
      scope: parsed.scope,
      grantedAt: parsed.grantedAt,
      documentRef: optional(fd, "document_ref"),
      notes: optional(fd, "notes"),
    });
    return `Consent recorded for ${parsed.scope}.`;
  });
}

export async function revokeConsentAction(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const makerId = text(fd, "maker_id");
  return run([`/admin/makers/${makerId}`, "/admin/makers"], async () => {
    const consentId = uuid.parse(text(fd, "consent_id"));
    const revokedAt = z
      .string()
      .min(1, "A revocation needs a date.")
      .parse(text(fd, "revoked_at") || new Date().toISOString().slice(0, 10));
    await admin.revokeConsent(consentId, revokedAt);
    return "Consent revoked. Publish the maker's name or portrait only under an active record.";
  });
}

export async function saveCommunityAction(_prev: ActionState, fd: FormData): Promise<ActionState> {
  return run(["/admin/communities", "/admin/makers"], async () => {
    const parsed = z
      .object({
        slug,
        name: z.string().min(1, "Name is required."),
        district: z.string().min(1, "District is required."),
        status: z.enum(["draft", "published", "archived"]),
      })
      .parse({
        slug: text(fd, "slug"),
        name: text(fd, "name"),
        district: text(fd, "district"),
        status: text(fd, "status"),
      });

    await admin.saveCommunity({
      id: optional(fd, "community_id"),
      slug: parsed.slug,
      name: parsed.name,
      district: parsed.district,
      province: optional(fd, "province"),
      summary: optional(fd, "summary"),
      story: optional(fd, "story"),
      makerCount: number(fd, "maker_count"),
      workingSince: number(fd, "working_since"),
      status: parsed.status,
    });
    return "Community saved.";
  });
}

/* ---------------------------------------------------------------- impact */

export async function refreshImpactAction(_prev: ActionState, _fd: FormData): Promise<ActionState> {
  return run(["/admin/impact", "/admin"], async () => {
    await admin.refreshImpact();
    return "Impact views refreshed.";
  });
}

/* --------------------------------------------------------------- journal */

export async function createJournalAction(_prev: ActionState, fd: FormData): Promise<ActionState> {
  return run(["/admin/journal"], async () => {
    const parsed = z
      .object({ slug, title: z.string().min(1, "Title is required.") })
      .parse({ slug: text(fd, "slug"), title: text(fd, "title") });
    const id = await admin.createJournalPage(parsed.slug, parsed.title);
    redirect(`/admin/journal/${id}`);
  });
}

export async function saveJournalAction(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const pageId = text(fd, "page_id");
  return run([`/admin/journal/${pageId}`, "/admin/journal"], async () => {
    const parsed = z
      .object({ pageId: uuid, slug, title: z.string().min(1, "Title is required.") })
      .parse({ pageId, slug: text(fd, "slug"), title: text(fd, "title") });

    await admin.saveJournalDraft({
      pageId: parsed.pageId,
      slug: parsed.slug,
      title: parsed.title,
      excerpt: optional(fd, "excerpt"),
      heroImage: optional(fd, "hero_image"),
      author: optional(fd, "author"),
      body: text(fd, "body"),
      productIds: fd.getAll("product_ids").map(String).filter(Boolean),
    });
    return "Draft saved as a new version. Nothing public changed yet.";
  });
}

export async function publishJournalAction(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const pageId = text(fd, "page_id");
  return run([`/admin/journal/${pageId}`, "/admin/journal", "/journal"], async () => {
    await admin.publishJournal(uuid.parse(pageId));
    return "Published. The public pointer now points at this draft.";
  });
}

export async function unpublishJournalAction(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const pageId = text(fd, "page_id");
  return run([`/admin/journal/${pageId}`, "/admin/journal", "/journal"], async () => {
    await admin.unpublishJournal(uuid.parse(pageId));
    return "Unpublished. The draft is untouched.";
  });
}
