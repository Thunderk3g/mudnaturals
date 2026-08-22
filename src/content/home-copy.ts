/**
 * Strings the shell and homepage need that copy.ts does not carry. Same rule as
 * copy.ts: nothing user-facing is written inline in a component.
 */

export const homeCopy = {
  heroImageAlt: "A magenta moon bag, coiled by hand from sikki grass.",
  newObjectsTitle: "Recently added",
  portraitAlt: (name: string) => `${name}, photographed at work`,
  coverAlt: (title: string) => `Cover image for ${title}`,

  footer: {
    navLabel: "Site map",
    elsewhereHeading: "Elsewhere",
    instagram: "Instagram",
    // Placeholder handle and inbox — swap for the live accounts before launch.
    instagramHref: "https://instagram.com/mudnaturals",
    email: "hello@mudnaturals.com",
    impactBandNote: "Counted from what we have bought and sold, not estimated.",
    photographyNote:
      "Every photograph is of the object we ship, corrected for colour and nothing else.",
    newsletterNote: "Signup opens with the shop.",
  },
} as const;
