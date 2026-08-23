"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireSession } from "@/lib/admin-auth";
import { isBlockType, parseBlockData, BLOCK_SPECS, type PageKey } from "@/lib/blocks";
import { navFromForm, seoFromForm, siteFromForm } from "@/lib/site-settings";
import { rupeesToPaisa } from "@/lib/money";
import * as cms from "@/server/admin-cms";
import { getBlockForEdit, revalidateCms } from "@/server/cms";
import { humanError } from "@/server/admin";
import { run, text, optional, integer, flag, isRedirect } from "./plumbing";
import type { ActionState } from "./ui";

/**
 * Console mutations for everything the storefront renders.
 *
 * Every one of these ends in the same two calls: `revalidateCms()` drops the
 * tagged reads in src/server/cms.ts, and `revalidatePath("/", "layout")` drops
 * the rendered pages that used them. Without the second, a change lands in the
 * database, the console shows it, and the live site keeps serving the old
 * static HTML for five minutes — which reads to an operator as "the CMS is
 * broken" and is the single most common way a setup like this disappoints.
 */

const uuid = z.string().uuid("That record id is not valid.");
const slug = z
  .string()
  .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, "Web address must be lowercase words separated by hyphens.");

const PAGE_KEYS = ["home", "about", "shop"] as const;

/** Drops both the cached reads and the pages built from them. */
function publish(extraPaths: string[] = []) {
  revalidateCms();
  revalidatePath("/", "layout");
  for (const path of extraPaths) revalidatePath(path);
}

/* ------------------------------------------------------------------ media -- */

export async function uploadMediaAction(_prev: ActionState, fd: FormData): Promise<ActionState> {
  return run(["/admin/media"], async () => {
    const file = fd.get("file");
    if (!(file instanceof File)) throw new cms.OperatorError("Choose a file to upload.");
    await cms.uploadMedia(file, text(fd, "alt"));
    publish();
    return "Image added to the library.";
  });
}

/**
 * Called imperatively by the photo picker rather than by submitting a form.
 *
 * A picker lives inside whatever form it is editing, and a form cannot contain
 * another form — so uploading from inside the product or section editor has to
 * be a direct action call. It returns the new id so the picker can select it
 * without a round trip through the page.
 */
export async function uploadMediaInline(fd: FormData): Promise<{ id?: string; error?: string }> {
  await requireSession();
  try {
    const file = fd.get("file");
    if (!(file instanceof File)) return { error: "Choose a file to upload." };
    const id = await cms.uploadMedia(file, text(fd, "alt"));
    revalidateCms();
    revalidatePath("/admin/media");
    return { id };
  } catch (error) {
    if (isRedirect(error)) throw error;
    return { error: humanError(error) };
  }
}

export async function updateMediaAction(_prev: ActionState, fd: FormData): Promise<ActionState> {
  return run(["/admin/media"], async () => {
    const id = uuid.parse(text(fd, "id"));
    await cms.updateMedia(id, text(fd, "alt"), text(fd, "focal_point") || "center");
    publish();
    return "Saved.";
  });
}

export async function deleteMediaAction(_prev: ActionState, fd: FormData): Promise<ActionState> {
  return run(["/admin/media"], async () => {
    await cms.deleteMedia(uuid.parse(text(fd, "id")));
    publish();
    return "Image deleted.";
  });
}

/* ----------------------------------------------------------------- blocks -- */

export async function createBlockAction(_prev: ActionState, fd: FormData): Promise<ActionState> {
  await requireSession();

  const pageKey = text(fd, "page_key");
  const blockType = text(fd, "block_type");

  if (!PAGE_KEYS.includes(pageKey as PageKey)) return { error: "Unknown page." };
  if (!isBlockType(blockType)) return { error: "Unknown section type." };

  let id: string;
  try {
    id = await cms.createBlock(pageKey as PageKey, blockType);
  } catch {
    return { error: "Could not add that section." };
  }

  publish();
  // New sections start hidden, so the operator lands on the editor and decides
  // when it goes live rather than pushing an empty band onto the homepage.
  redirect(`/admin/website/${pageKey}/${id}`);
}

export async function saveBlockAction(_prev: ActionState, fd: FormData): Promise<ActionState> {
  return run([], async () => {
    const id = uuid.parse(text(fd, "id"));
    const blockType = text(fd, "block_type");
    if (!isBlockType(blockType)) throw new cms.OperatorError("Unknown section type.");

    await cms.updateBlock(id, parseBlockData(blockType, fd), flag(fd, "is_visible"));
    publish();
    return flag(fd, "is_visible")
      ? `Saved. ${BLOCK_SPECS[blockType].label} is live on the site.`
      : "Saved as hidden — nobody can see it on the site yet.";
  });
}

export async function deleteBlockAction(_prev: ActionState, fd: FormData): Promise<ActionState> {
  await requireSession();
  const pageKey = text(fd, "page_key");
  try {
    await cms.deleteBlock(uuid.parse(text(fd, "id")));
  } catch {
    return { error: "Could not delete that section." };
  }
  publish();
  redirect(`/admin/website/${PAGE_KEYS.includes(pageKey as PageKey) ? pageKey : "home"}`);
}

export async function moveBlockAction(_prev: ActionState, fd: FormData): Promise<ActionState> {
  return run([`/admin/website/${text(fd, "page_key") || "home"}`], async () => {
    const direction = text(fd, "direction") === "up" ? "up" : "down";
    await cms.moveBlock(uuid.parse(text(fd, "id")), direction);
    publish();
    return "Moved.";
  });
}

/** The one-click show/hide on the page list, so nothing needs opening to unpublish. */
export async function toggleBlockAction(_prev: ActionState, fd: FormData): Promise<ActionState> {
  return run([`/admin/website/${text(fd, "page_key") || "home"}`], async () => {
    const id = uuid.parse(text(fd, "id"));
    const block = await getBlockForEdit(id);
    if (!block) throw new cms.OperatorError("That section no longer exists.");
    await cms.updateBlock(id, block.data, !block.is_visible);
    publish();
    return block.is_visible ? "Hidden from the site." : "Now live on the site.";
  });
}

/* ------------------------------------------------------------- categories -- */

export async function saveCategoryAction(_prev: ActionState, fd: FormData): Promise<ActionState> {
  return run(["/admin/categories"], async () => {
    await cms.saveCategory({
      id: optional(fd, "id"),
      slug: slug.parse(text(fd, "slug")),
      name: text(fd, "name"),
      description: optional(fd, "description"),
      imageId: optional(fd, "image_id"),
      sortOrder: integer(fd, "sort_order"),
      status: text(fd, "status") || "draft",
    });
    publish();
    return "Category saved.";
  });
}

export async function deleteCategoryAction(_prev: ActionState, fd: FormData): Promise<ActionState> {
  return run(["/admin/categories"], async () => {
    await cms.deleteCategory(uuid.parse(text(fd, "id")));
    publish();
    return "Category deleted.";
  });
}

/* ------------------------------------------------------------ collections -- */

export async function saveCollectionAction(_prev: ActionState, fd: FormData): Promise<ActionState> {
  return run(["/admin/collections"], async () => {
    await cms.saveCollection({
      id: optional(fd, "id"),
      slug: slug.parse(text(fd, "slug")),
      title: text(fd, "title"),
      subtitle: optional(fd, "subtitle"),
      story: optional(fd, "story"),
      coverImageId: optional(fd, "cover_image_id"),
      sortOrder: integer(fd, "sort_order"),
      status: text(fd, "status") || "draft",
      productIds: fd
        .getAll("product_ids")
        .map((v) => (typeof v === "string" ? v.trim() : ""))
        .filter(Boolean),
    });
    publish();
    return "Collection saved.";
  });
}

export async function deleteCollectionAction(_prev: ActionState, fd: FormData): Promise<ActionState> {
  await requireSession();
  try {
    await cms.deleteCollection(uuid.parse(text(fd, "id")));
  } catch {
    return { error: "Could not delete that collection." };
  }
  publish();
  redirect("/admin/collections");
}

/* -------------------------------------------------------- product imagery -- */

export async function addProductImageAction(_prev: ActionState, fd: FormData): Promise<ActionState> {
  return run([], async () => {
    const productId = uuid.parse(text(fd, "product_id"));

    // The picker either hands back a library id or a fresh file. Uploading from
    // inside the product editor is the path an operator actually takes.
    let mediaId = optional(fd, "media_id");
    if (!mediaId) {
      const file = fd.get("file");
      if (!(file instanceof File) || file.size === 0) {
        throw new cms.OperatorError("Choose an image from the library, or upload a file.");
      }
      mediaId = await cms.uploadMedia(file, text(fd, "alt"));
    }

    await cms.addProductImage(productId, mediaId, text(fd, "alt"));
    publish([`/admin/products/${productId}`]);
    return "Photograph added.";
  });
}

export async function removeProductImageAction(_prev: ActionState, fd: FormData): Promise<ActionState> {
  return run([`/admin/products/${text(fd, "product_id")}`], async () => {
    await cms.removeProductImage(uuid.parse(text(fd, "id")));
    publish();
    return "Photograph removed.";
  });
}

export async function moveProductImageAction(_prev: ActionState, fd: FormData): Promise<ActionState> {
  return run([`/admin/products/${text(fd, "product_id")}`], async () => {
    const direction = text(fd, "direction") === "up" ? "up" : "down";
    await cms.moveProductImage(uuid.parse(text(fd, "id")), direction);
    publish();
    return "Reordered.";
  });
}

export async function updateProductImageAltAction(_prev: ActionState, fd: FormData): Promise<ActionState> {
  return run([`/admin/products/${text(fd, "product_id")}`], async () => {
    await cms.updateProductImageAlt(uuid.parse(text(fd, "id")), text(fd, "alt"));
    publish();
    return "Description saved.";
  });
}

/* --------------------------------------------------------------- settings -- */

export async function saveSiteSettingsAction(_prev: ActionState, fd: FormData): Promise<ActionState> {
  return run(["/admin/settings"], async () => {
    await cms.saveSetting("site", siteFromForm(fd));
    publish();
    return "Saved. The change is live.";
  });
}

export async function saveNavAction(_prev: ActionState, fd: FormData): Promise<ActionState> {
  return run(["/admin/settings/navigation"], async () => {
    const nav = navFromForm(fd);
    if (nav.primary.length === 0) {
      throw new cms.OperatorError("Keep at least one link in the main menu.");
    }
    await cms.saveSetting("nav", nav);
    publish();
    return "Menu saved. The change is live.";
  });
}

export async function saveSeoAction(_prev: ActionState, fd: FormData): Promise<ActionState> {
  return run(["/admin/settings/seo"], async () => {
    await cms.saveSetting("seo", seoFromForm(fd));
    publish();
    return "Saved.";
  });
}

/**
 * Shipping and cash-on-delivery rules. These are the only settings that change
 * what a customer is charged, so they are read in rupees and stored in paisa —
 * the same conversion the checkout uses, in one direction only.
 */
export async function saveCommerceSettingsAction(_prev: ActionState, fd: FormData): Promise<ActionState> {
  return run(["/admin/settings/commerce"], async () => {
    const rupees = (key: string) => {
      const value = Number(text(fd, key));
      if (!Number.isFinite(value) || value < 0) {
        throw new cms.OperatorError("Every amount must be a number of rupees, zero or more.");
      }
      return rupeesToPaisa(value);
    };

    await cms.saveSetting("shipping", {
      inside_valley_paisa: rupees("inside_valley"),
      outside_valley_paisa: rupees("outside_valley"),
      free_over_paisa: rupees("free_over"),
      valley_districts: text(fd, "valley_districts")
        .split(",")
        .map((d) => d.trim())
        .filter(Boolean),
    });

    await cms.saveSetting("cod", {
      enabled: flag(fd, "cod_enabled"),
      max_order_paisa: rupees("cod_max"),
      max_refusals_before_block: integer(fd, "cod_refusals", 2),
    });

    // Which online tills are open. COD's own switch lives above; this row is
    // what checkout reads to decide which methods to offer at all.
    await cms.saveSetting("payments", {
      enabled: {
        esewa: flag(fd, "pay_esewa"),
        khalti: flag(fd, "pay_khalti"),
        fonepay: flag(fd, "pay_fonepay"),
        cod: flag(fd, "cod_enabled"),
      },
    });

    publish();
    return "Saved. New orders use these rules immediately.";
  });
}
