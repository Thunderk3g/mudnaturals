/**
 * Strings the shell and homepage need that copy.ts does not carry. Same rule as
 * copy.ts: nothing user-facing is written inline in a component.
 */

export const homeCopy = {
  heroImageAlt: "A magenta moon bag, coiled by hand from sikki grass.",
  /**
   * What the hero shows until someone uploads a photo in the console. The block
   * carries a `media_id`; `imageSrc` prefers it and falls back to this path, so
   * the page that shipped keeps its picture and an upload replaces it.
   */
  heroFallbackImage: "/media/moon-bag-magenta.jpg",
  coverAlt: (title: string) => `Cover image for ${title}`,

  footer: {
    navLabel: "Site map",
    elsewhereHeading: "Elsewhere",
    instagram: "Instagram",
    email: "Email",
    phone: "Phone",
    impactBandNote: "Counted from what we have bought and sold, not estimated.",
    photographyNote:
      "Every photograph is of the object we ship, corrected for colour and nothing else.",
    newsletterNote: "Signup opens with the shop.",
  },
} as const;

/** Strings the CMS-driven page blocks need when a payload leaves a gap. */
export const blockCopy = {
  communityImageAlt: (name: string) => `${name}, photographed where the work is made`,
  bannerImageAlt: "MUD Naturals, photographed on location in Nepal",
  announcementLabel: "Announcement",
} as const;
