/**
 * Strings for the story surfaces — makers, collections, craft, journal, impact,
 * about, contact. `copy.ts` is shared and frozen; anything the story pages need
 * beyond it lives here.
 *
 * Same register, enforced: verbs of making, never verbs of helping. Makers are
 * partners and producers. Banned throughout — help, support, give back, empower,
 * uplift, underprivileged, change lives, beneficiary, and unqualified
 * eco-friendly / green / responsible.
 */

export const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

/** Dates wear the mono specimen register everywhere, so they format one way. */
export function formatSpecDate(value: string | Date | null): string | null {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

/** ISO for `<time datetime>` and JSON-LD, which want machine dates. */
export function isoDate(value: string | Date | null): string | undefined {
  if (!value) return undefined;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date.toISOString();
}

export const storyCopy = {
  shared: {
    shopEverything: "Browse the shop",
    railEmpty: "Nothing from this record is in the shop right now.",
    railEmptyBody: "Stock moves in small runs. The rest of the catalogue is open.",
  },

  makers: {
    eyebrow: "The record",
    recordTitle: "Workshop record",
    attributionTitle: "How this page is attributed",
    attributionBody:
      "This is a workshop-level record. It carries the community name, its district and its craft because that is what has been agreed for publication. A personal name, a portrait and a quote appear here the moment a maker signs for them, and come down the day they ask.",
    community: "Community",
    district: "District",
    craft: "Craft",
    materials: "Materials",
    makerCount: "Makers in the workshop",
    workingSince: "Working with us since",
    objectsInShop: "Objects in the shop",
    aboutCommunity: "About the workshop",
    processIntro: "The order is load-bearing — a step out of sequence changes the object.",
    noProcess: "The techniques worked here are catalogued under Craft & Materials.",
    seeCraft: "Craft & Materials",
  },

  collections: {
    title: "Collections",
    intro:
      "Objects grouped the way they are used, not the way they are categorised. Each collection is a set that reads as one thing on a table, a shoulder or a floor.",
    objectCount: (n: number) => (n === 1 ? "1 object" : `${n} objects`),
    inThisCollection: "In this collection",
    empty: "No collections are published yet.",
  },

  craft: {
    materialsTitle: "Materials",
    materialsIntro:
      "Four plants carry almost everything in the shop. Cut, dried, split and worked — the fibre decides what a form can do.",
    techniquesTitle: "Techniques",
    techniquesIntro:
      "How the fibre becomes the object. Every technique here is worked by hand, in the order shown.",
    localName: "Local name",
    origin: "Origin",
    kindMaterial: "Material",
    kindTechnique: "Technique",
    objectCount: "Objects in the shop",
    steps: "The sequence",
    empty: "Nothing is catalogued here yet.",
  },

  journal: {
    author: "Written by",
    backToJournal: "All field notes",
    shopThisStoryBody: "Every object named above, in one place.",
    noProducts: "This note does not point at a single object. The catalogue is here.",
  },

  impact: {
    eyebrow: "Mechanism, not statistics",
    philosophy: "People × Nature × Craft × Commerce",
    lede:
      "Two things happen with money here, and they are not the same thing. The first is a purchase. The second is a fund. We describe both, in that order, because the order is the argument.",

    tradeEyebrow: "Layer one",
    tradeDetail: [
      "A price is agreed with the workshop before anything is made. We buy the run outright at that price and pay on delivery — not on sale, not on consignment, not net-60.",
      "That makes the stock ours from the moment it arrives. If a piece sits unsold for six months, the cost of that is carried here, not by the weaver. It is the largest single flow of money in this business and it is contingent on nothing.",
    ],

    fundEyebrow: "Layer two",
    fundHeadline: "80% sustains the enterprise, 20% fuels our impact",
    fundDetail: [
      "The fund pays for equipment, training and product development, decided with the workshops and reported once a year.",
      "It is second in this order deliberately. A fund is a good thing to run; it is not what pays a weaver this month.",
    ],
    flowTitle: "How the loop closes",
    flowCaption:
      "Money moves in one direction around this loop. Nothing in the diagram is a projection — it is the sequence the business runs on.",

    countsEyebrow: "Live counts",
    countsTitle: "What is countable today",
    countsCaption: "Read from the catalogue and the order ledger at page build. Nothing here is rounded up.",

    byCommunityTitle: "By workshop",
    byCommunityCaption: "Objects sold, per workshop, since the first intake.",

    methodBody: [
      "Objects sold counts units on orders that reached paid, confirmed, packed, shipped or delivered. Cancelled and unpaid orders are excluded.",
      "Makers, communities and districts count published records — a workshop that exists in the catalogue but has not been published is not counted.",
      "Figures are read directly from the order ledger and the stock intake records at page build, and refresh every five minutes. There is no manual entry step between the ledger and this page.",
    ],

    limitationsBody: [
      "These are counts of transactions on this site. They are not a measure of income, working conditions, hours, health, schooling or anything else about the people who made these objects. We do not measure those things and we do not claim to.",
      "Sales made off this site — markets, wholesale, direct orders — are not in these numbers.",
      "The share of each price that reaches the maker is not published. It is agreed per run rather than fixed as a percentage, and no figure has been agreed for publication. When one is, it will appear on the product page and here, with the date it was agreed.",
      "No figure on this page has been audited by anyone outside MUD Naturals.",
      "The catalogue is young. Small numbers move a lot in percentage terms, which is why percentages are not used here.",
    ],

    fundFormulaLabel: "Fund formula",
    noShareTitle: "Per-object maker share",
    noShareBody:
      "Not published. The figure exists per production run, not per object, and has not been agreed for publication. This block will show it when it is.",
  },

  about: {
    eyebrow: "About",
    title: "We started with mud.",
    spine: [
      "Clay, grass, bark, seed — the materials Nepali hands have shaped for generations. MUD Naturals is a concept store for the things those hands still make: baskets coiled from kans grass, mats woven in a single pass, vessels shaped from papyrus.",
      "We are a business, and we say so plainly. We find remarkable makers and producers, work with them on design, quality and packaging, and bring their work to people who value it — at fair, fixed prices agreed together, not negotiated down.",
      "Nothing here asks for sympathy. Everything here earns its place.",
    ],
    philosophyTitle: "The four terms",
    philosophyItems: [
      { term: "People", body: "Named workshops, agreed prices, written consent before a name is published." },
      { term: "Nature", body: "Wild grasses cut in season and by hand, so the beds regrow. Stated per material, never as a slogan." },
      { term: "Craft", body: "Techniques catalogued step by step, because the sequence is the skill." },
      { term: "Commerce", body: "Stock bought outright and paid for on delivery. A trade, run as a trade." },
    ],
    photographyTitle: "Photography note",
    photographyBody: [
      "Every image on this site is cropped from MUD Naturals' own photographs of the actual objects and the places they come from. Product images are crops, not composites.",
      "No product image here is generated, and none is stock. Where a photograph shows a material or a landscape rather than an object, it is captioned as such rather than presented as a portrait or a product shot.",
      "Some crops are tighter than we would like. That is a photography backlog, not a style.",
    ],
    consentTitle: "Names and consent",
    provenanceTitle: "What we publish about origin",
    provenanceBody:
      "District reads “Nepal” on every record here, because that is the geography the workshops have agreed to publish. A more precise district appears when it is agreed, not before. We would rather print a vague true thing than a specific invented one.",
  },

  contact: {
    title: "Contact",
    intro:
      "Questions about an order, a wholesale enquiry, or a workshop that wants to sell through us — this is the way in.",
    channelsTitle: "Direct routes",
    channelsPending:
      "Direct email and WhatsApp are not published on this site yet. When they are, they appear here.",
    formTitle: "Write to us",
    formDisconnected:
      "This form is not connected to a mailbox yet, so nothing sent from it will reach us. It is here so the page is complete the day the address is published.",
    name: "Your name",
    email: "Your email",
    subject: "Subject",
    subjectOptions: ["An order", "Wholesale", "Selling through MUD", "Something else"],
    message: "Message",
    send: "Send",
    required: "Required",
    addressTitle: "Where we are",
    addressBody:
      "Kathmandu, Nepal. No street address is published — we do not run a shopfront yet, and printing one before we do would be a lie you could turn up to.",
  },
} as const;
