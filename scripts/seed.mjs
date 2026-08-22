// Seeds the catalogue from what the brand has actually published.
//
// Two honesty rules held throughout, because provenance is the product:
//   * No invented people. Every maker row is a workshop-level record whose
//     display name is its community, so the site shows community attribution
//     until real names arrive with written consent (decision 4).
//   * No invented provenance. Districts read "Nepal" — the only geography the
//     brand has stated publicly — rather than a plausible-sounding district.
//
// Prices are PROVISIONAL. No price appears anywhere in the published material;
// see QUESTIONS.md #1. `maker_share_paisa` is deliberately null so the PDP
// impact module stays hidden rather than printing a number nobody has agreed.

import postgres from "postgres";
import { loadEnv } from "./env.mjs";

loadEnv();

const sql = postgres(process.env.DATABASE_URL, {
  ssl: "require",
  max: 1,
  connect_timeout: 30,
  connection: { search_path: "public, extensions" },
});

const R = (rupees) => Math.round(rupees * 100);

// ---------------------------------------------------------------- content ---

const COMMUNITIES = [
  {
    slug: "kans-weaving-circle",
    name: "Kans Weaving Circle",
    district: "Nepal",
    summary: "The weavers who work the reed and kans grass that most of the shop is made from.",
    story:
      "Kans grass grows wild along riverbanks and field edges across the Nepali lowlands. Cut at the end of the monsoon, dried, split and braided, it becomes the flat rope that every bag, mat and tray here is built from. The circle works to order and in small runs, and the weave tightens as the season goes on.",
    cover_image: "/media/kans-grass-growing.jpg",
    working_since: 2024,
  },
  {
    slug: "pater-mat-weavers",
    name: "Pater Mat Weavers",
    district: "Nepal",
    summary: "Long-format floor and meditation mats, woven on the ground in single pieces.",
    story:
      "Pater is cut, sun-dried and laid out full length before weaving begins. A mat is finished in one continuous pass, which is why the edges run straight and why no two are exactly the same length.",
    cover_image: "/media/meditation-mats.jpg",
    working_since: 2024,
  },
  {
    slug: "gulguliya-workshop",
    name: "Gulguliya Workshop",
    district: "Nepal",
    summary: "Vessels and desk objects in gulguliya, a papyrus grass harvested by hand.",
    story:
      "Gulguliya is a papyrus that grows in standing water. It is harvested by hand so the beds regenerate, dried until it holds a curve, then coiled into forms that keep their shape without any frame inside them.",
    cover_image: "/media/gulguliya-vase-pen-stand.jpg",
    working_since: 2024,
  },
];

const MATERIALS = [
  {
    slug: "kans-grass",
    name: "Kans grass",
    local_name: "काँस",
    description:
      "A tall wild grass from riverbanks and field margins. Cut after the monsoon, dried, split and braided into a flat rope that is strong enough to carry weight and soft enough to hold a curve.",
    origin_note: "Wild-harvested, Nepali lowlands.",
  },
  {
    slug: "pater-grass",
    name: "Pater grass",
    local_name: "पटेर",
    description:
      "A dense wetland grass used for floor mats. It flattens as it dries, which is what gives a finished mat its even surface and its weight.",
    origin_note: "Wild-harvested, Nepal.",
  },
  {
    slug: "gulguliya-papyrus",
    name: "Gulguliya papyrus",
    local_name: "गुलगुलिया",
    description:
      "A papyrus grass that grows in standing water and is cut by hand so the beds regrow. Holds a coil without a frame, which is how the vases keep their waist.",
    origin_note: "Hand-harvested, Nepal.",
  },
  {
    slug: "cane",
    name: "Cane",
    description: "Steam-bent into the ring handles, left with its bark on so no two rings match.",
    origin_note: "Nepal.",
  },
];

const TECHNIQUES = [
  {
    slug: "flat-braid-weaving",
    name: "Flat-braid weaving",
    description:
      "Grass is split into even widths, braided into a flat rope, then coiled and stitched into shape. The whole body of a bag is one continuous braid.",
    steps: [
      { step: 1, title: "Cut and dry", body: "Grass is cut after the monsoon and sun-dried until it stops shrinking." },
      { step: 2, title: "Split", body: "Each blade is split by hand into even widths so the braid stays regular." },
      { step: 3, title: "Braid", body: "Three strands are worked into a flat rope, metres of it before shaping begins." },
      { step: 4, title: "Coil and stitch", body: "The rope is coiled into the form and stitched pass by pass." },
      { step: 5, title: "Finish", body: "The rim is turned, the handle set, and any embroidery worked into the face." },
    ],
  },
  {
    slug: "coil-weaving",
    name: "Coil weaving",
    description:
      "A bundle of grass is wrapped and stitched in a rising spiral. No frame, no mould — the form is held by the tension of the stitch.",
    steps: [
      { step: 1, title: "Bundle", body: "Dried grass is gathered into a consistent core." },
      { step: 2, title: "Wrap", body: "The core is bound as it is laid, one row stitched into the row beneath." },
      { step: 3, title: "Shape", body: "Tension alone pulls the wall in or lets it flare." },
    ],
  },
  {
    slug: "fibre-embroidery",
    name: "Dyed-fibre embroidery",
    description:
      "Flowers are worked directly into the finished weave with grass fibre dyed in single colours, then centred with a bead.",
    steps: [
      { step: 1, title: "Dye", body: "Fibre is dyed in small batches, so a colourway rarely repeats exactly." },
      { step: 2, title: "Lay the bloom", body: "Petals are stitched through the weave, not onto a backing." },
      { step: 3, title: "Set the centre", body: "A bead is fixed at the heart of each flower." },
    ],
  },
  {
    slug: "mat-weaving",
    name: "Mat weaving",
    description:
      "Full-length mats woven flat on the ground in a single continuous pass, edges bound as the weaver reaches them.",
    steps: [
      { step: 1, title: "Lay the length", body: "Dried pater is laid out to the finished length before any weaving starts." },
      { step: 2, title: "Weave through", body: "The mat is worked in one pass from end to end." },
      { step: 3, title: "Bind the edge", body: "Edges are bound as they are reached, which keeps the mat from splaying." },
    ],
  },
];

const CATEGORIES = [
  { slug: "craft-home", name: "Craft & Home", description: "Baskets, bags, mats and objects for the table and floor.", sort_order: 1, status: "published" },
  // Parked, not cut. Natural Care and Food & Pantry are the repeat-purchase
  // categories; neither has supply evidence yet, and food additionally waits on
  // DFTQC labelling (QUESTIONS.md #3 and #4).
  { slug: "natural-care", name: "Natural Care", description: "Oils, soaps and everyday care.", sort_order: 2, status: "draft" },
  { slug: "food-pantry", name: "Food & Pantry", description: "Teas, honeys and pantry staples.", sort_order: 3, status: "draft" },
  { slug: "candles-ritual", name: "Candles & Ritual", description: "Candles and incense.", sort_order: 4, status: "draft" },
];

const PRODUCTS = [
  {
    slug: "moon-bag",
    name: "Moon Bag",
    subtitle: "Crescent tote in braided kans grass",
    description:
      "A crescent silhouette in close-braided kans grass, finished with a raw cane ring handle and a bloom embroidered straight into the weave. Deep enough for a book, a bottle and everything else, and it holds its shape empty.",
    care: "Keep dry. Brush the weave with a soft brush. If it gets wet, dry it away from direct sun so the grass does not go brittle.",
    price: R(2800),
    category: "craft-home", community: "kans-weaving-circle",
    material: "kans-grass", technique: "flat-braid-weaving",
    labour_hours: 14,
    images: [
      ["moon-bag-magenta", "Moon Bag in braided kans grass with magenta embroidered flowers and a cane ring handle", true],
      ["moon-bag-open", "Moon Bag held open, showing the depth of the basket"],
      ["moon-bag-table", "Moon Bag with violet embroidery resting on a wooden table"],
    ],
    variants: [
      { sku: "MUD-MOON-S", option_name: "Size", option_value: "Small", price: R(2200), stock: 4 },
      { sku: "MUD-MOON-M", option_name: "Size", option_value: "Medium", price: R(2800), stock: 6, is_default: true },
      { sku: "MUD-MOON-L", option_name: "Size", option_value: "Large", price: R(3400), stock: 3 },
    ],
    collections: ["everyday-carry"],
  },
  {
    slug: "reed-clutch",
    name: "Reed Clutch",
    subtitle: "Half-moon clutch with an embroidered bouquet",
    description:
      "A flat half-moon clutch with its whole face given over to a single embroidered bouquet. Each colourway is dyed in a small batch, so no two bouquets read quite the same.",
    care: "Keep dry. Store flat.",
    price: R(1450),
    category: "craft-home", community: "kans-weaving-circle",
    material: "kans-grass", technique: "fibre-embroidery",
    labour_hours: 6,
    images: [
      ["reed-clutch", "Reed Clutch laid flat, embroidered with a bouquet in violet, marigold and magenta", true],
      ["reed-clutch-colourways", "Four Reed Clutches showing the range of embroidered colourways"],
    ],
    variants: [
      { sku: "MUD-CLU-MAR", option_name: "Colourway", option_value: "Marigold", stock: 3, is_default: true },
      { sku: "MUD-CLU-CRI", option_name: "Colourway", option_value: "Crimson", stock: 2 },
      { sku: "MUD-CLU-PEA", option_name: "Colourway", option_value: "Peach", stock: 2 },
      { sku: "MUD-CLU-VIO", option_name: "Colourway", option_value: "Violet", stock: 2 },
    ],
    collections: ["everyday-carry"],
  },
  {
    slug: "ring-handle-tote",
    name: "Ring-Handle Tote",
    subtitle: "Wide carry-all with a cane ring",
    description:
      "A wide trapezoid carry-all in flat-braid kans grass, held by a single circle of cane and marked with a chartreuse daisy spray. Sized for a market run or a day out with more than you meant to bring.",
    care: "Keep dry. Do not overload beyond the ring's set.",
    price: R(3200),
    category: "craft-home", community: "kans-weaving-circle",
    material: "kans-grass", technique: "flat-braid-weaving",
    labour_hours: 18,
    images: [
      ["ring-handle-tote", "Ring-Handle Tote against a plain wall, showing the cane ring handle", true],
      ["ring-handle-tote-daisies", "Detail of the chartreuse daisy embroidery on the tote face"],
      ["ring-handle-tote-detail", "Close view of the tote's braided weave"],
      ["ring-handle-tote-carried", "The Ring-Handle Tote carried at the shoulder"],
    ],
    variants: [{ sku: "MUD-RHT-STD", stock: 5, is_default: true }],
    collections: ["everyday-carry"],
  },
  {
    slug: "market-basket",
    name: "Market Basket",
    subtitle: "Square basket with braided rope handles",
    description:
      "A square-set basket with twin braided handles and a coral bloom worked across the front panel. Flat-bottomed, so it stands where you put it down.",
    care: "Keep dry. Brush out grit after market days.",
    price: R(3600),
    category: "craft-home", community: "kans-weaving-circle",
    material: "kans-grass", technique: "flat-braid-weaving",
    labour_hours: 20,
    images: [["market-basket", "Market Basket with braided rope handles and coral embroidery", true]],
    variants: [{ sku: "MUD-MKT-STD", stock: 4, is_default: true }],
    collections: ["everyday-carry"],
  },
  {
    slug: "braided-table-mat",
    name: "Round Braided Table Mat",
    subtitle: "Coiled disc for the table",
    description:
      "A coiled disc of braided grass, thick enough to sit under a hot serving dish and handsome enough to leave out between meals.",
    care: "Wipe with a dry cloth. Spot clean only.",
    price: R(950),
    category: "craft-home", community: "kans-weaving-circle",
    material: "kans-grass", technique: "coil-weaving",
    labour_hours: 5,
    images: [["braided-table-mats", "Stacked round braided table mats beside a woven serving bowl", true]],
    variants: [
      { sku: "MUD-TMAT-30", option_name: "Diameter", option_value: "30 cm", price: R(950), stock: 8, is_default: true },
      { sku: "MUD-TMAT-40", option_name: "Diameter", option_value: "40 cm", price: R(1350), stock: 5 },
    ],
    collections: ["the-table"],
  },
  {
    slug: "braided-coaster-set",
    name: "Braided Coaster, Set of Six",
    subtitle: "Small coiled discs",
    description:
      "The same braid as the table mats, at cup scale. Six to a set, because four is never enough.",
    care: "Wipe with a dry cloth.",
    price: R(700),
    category: "craft-home", community: "kans-weaving-circle",
    material: "kans-grass", technique: "coil-weaving",
    labour_hours: 3,
    images: [["braided-table-mats", "Braided coasters stacked with the matching table mats", true]],
    variants: [{ sku: "MUD-COAST-6", stock: 10, is_default: true }],
    collections: ["the-table"],
  },
  {
    slug: "woven-serving-bowl",
    name: "Woven Serving Bowl",
    subtitle: "Deep basket with a rolled rim",
    description:
      "A deep round basket with a rolled rim. Fruit on the counter, bread at the table, keys by the door.",
    care: "Keep dry. Line it if you are serving anything oiled.",
    price: R(1800),
    category: "craft-home", community: "kans-weaving-circle",
    material: "kans-grass", technique: "coil-weaving",
    labour_hours: 8,
    images: [["braided-table-mats", "Deep woven serving bowl with a rolled rim", true]],
    variants: [{ sku: "MUD-BOWL-STD", stock: 6, is_default: true }],
    collections: ["the-table"],
  },
  {
    slug: "meditation-mat",
    name: "Meditation Mat",
    subtitle: "Full-length mat in pater grass",
    description:
      "A full-length floor mat woven in one continuous pass — dense enough to sit on for an hour, light enough to roll under an arm. Woven in Nepal from pater grass cut and dried at the end of the season.",
    care: "Roll, do not fold. Air it occasionally. Keep out of standing damp.",
    price: R(4500),
    category: "craft-home", community: "pater-mat-weavers",
    material: "pater-grass", technique: "mat-weaving",
    labour_hours: 26,
    images: [
      ["meditation-mats", "Two pater grass meditation mats laid flat on grass", true],
      ["meditation-mat-in-use", "A meditation mat in use, seated"],
    ],
    variants: [{ sku: "MUD-MAT-PLAIN", stock: 4, is_default: true }],
    collections: ["floor-and-rest"],
  },
  {
    slug: "striped-meditation-mat",
    name: "Striped Meditation Mat",
    subtitle: "Banded full-length mat",
    description:
      "The same long mat, threaded through with soft ochre stripe bands along its length. The banding is woven in, not printed on.",
    care: "Roll, do not fold. Air it occasionally.",
    price: R(5200),
    category: "craft-home", community: "pater-mat-weavers",
    material: "pater-grass", technique: "mat-weaving",
    labour_hours: 32,
    images: [["meditation-mats", "A striped pater grass mat beside a plain one", true]],
    variants: [{ sku: "MUD-MAT-STRIPE", stock: 3, is_default: true }],
    collections: ["floor-and-rest"],
  },
  {
    slug: "woven-placemat",
    name: "Woven Placemat",
    subtitle: "Fine-weave rectangle",
    description:
      "A finely woven rectangle that gives the table texture without asking for attention. Sold singly, so a mismatched table is a choice rather than an accident.",
    care: "Wipe with a dry cloth. Spot clean only.",
    price: R(850),
    category: "craft-home", community: "kans-weaving-circle",
    material: "kans-grass", technique: "mat-weaving",
    labour_hours: 4,
    images: [["woven-placemats", "Fine-weave grass placemats set with white ceramic cups", true]],
    variants: [{ sku: "MUD-PMAT-STD", stock: 12, is_default: true }],
    collections: ["the-table"],
  },
  {
    slug: "storage-tray",
    name: "Storage Tray",
    subtitle: "Shallow tray with cut-out handles",
    description:
      "A shallow square tray with cut-out side handles, built to stack, to be carried full, and to be handed over with something in it.",
    care: "Keep dry. Brush out crumbs.",
    price: R(1600),
    category: "craft-home", community: "kans-weaving-circle",
    material: "kans-grass", technique: "flat-braid-weaving",
    labour_hours: 7,
    images: [["storage-trays", "Woven storage trays with cut-out side handles", true]],
    variants: [
      { sku: "MUD-TRAY-S", option_name: "Size", option_value: "Small", price: R(1600), stock: 7, is_default: true },
      { sku: "MUD-TRAY-L", option_name: "Size", option_value: "Large", price: R(2100), stock: 5 },
    ],
    collections: ["the-table"],
  },
  {
    slug: "gulguliya-vase",
    name: "Gulguliya Vase",
    subtitle: "Hourglass vessel in papyrus grass",
    description:
      "An hourglass vessel coiled from gulguliya papyrus, cinched at the waist and holding its shape with no frame inside it. For dried stems — it is not watertight, and is not meant to be.",
    care: "Dry stems only. Keep away from water.",
    price: R(2400),
    category: "craft-home", community: "gulguliya-workshop",
    material: "gulguliya-papyrus", technique: "coil-weaving",
    labour_hours: 11,
    images: [["gulguliya-vase-pen-stand", "Gulguliya papyrus vase with dried grass stalks, beside a matching pen stand", true]],
    variants: [{ sku: "MUD-VASE-STD", stock: 5, is_default: true }],
    collections: ["floor-and-rest"],
  },
  {
    slug: "gulguliya-pen-stand",
    name: "Gulguliya Pen Stand",
    subtitle: "Straight-sided desk cylinder",
    description:
      "A straight-sided cylinder in the same papyrus coil, sized for a desk and heavy enough at the base not to tip when you drop a pen back in.",
    care: "Keep dry.",
    price: R(1200),
    category: "craft-home", community: "gulguliya-workshop",
    material: "gulguliya-papyrus", technique: "coil-weaving",
    labour_hours: 6,
    images: [["gulguliya-vase-pen-stand", "Gulguliya papyrus pen stand on a desk", true]],
    variants: [{ sku: "MUD-PEN-STD", stock: 8, is_default: true }],
    collections: ["floor-and-rest"],
  },
  {
    slug: "floor-pouf",
    name: "Floor Pouf",
    subtitle: "Coiled seat that doubles as a table",
    description:
      "A low round pouf in heavy coiled braid — extra seating when the room fills up, a side table when it does not. Firm enough to take a tray.",
    care: "Keep dry. Rotate occasionally so it wears evenly.",
    price: R(7800),
    category: "craft-home", community: "kans-weaving-circle",
    material: "kans-grass", technique: "coil-weaving",
    labour_hours: 40,
    images: [["floor-pouf", "Round coiled floor pouf with books resting on top", true]],
    variants: [{ sku: "MUD-POUF-STD", stock: 2, is_default: true }],
    collections: ["floor-and-rest"],
  },
  // Held as drafts: announced but not yet photographed apart from other stock.
  {
    slug: "planter-basket",
    name: "Planter Basket",
    subtitle: "Straight-walled sleeve for a nursery pot",
    description: "A straight-walled basket sized to sleeve a nursery pot and hide the plastic.",
    care: "Keep the pot in its liner. Do not water through the basket.",
    price: R(1900), status: "draft",
    category: "craft-home", community: "kans-weaving-circle",
    material: "kans-grass", technique: "coil-weaving",
    labour_hours: 8,
    images: [["floor-pouf", "Woven planter basket holding a spider plant"]],
    variants: [{ sku: "MUD-PLNT-STD", stock: 0, is_default: true }],
    collections: [],
  },
  {
    slug: "lace-trim-sun-hat",
    name: "Lace-Trim Sun Hat",
    subtitle: "Wide brim banded in cotton lace",
    description: "A wide-brim woven hat banded in cotton lace. Announced, not yet released.",
    care: "Keep dry. Store on its crown.",
    price: R(2200), status: "draft",
    category: "craft-home", community: "kans-weaving-circle",
    material: "kans-grass", technique: "flat-braid-weaving",
    labour_hours: 9,
    images: [["sun-hat-worn", "A woven sun hat worn outdoors"]],
    variants: [{ sku: "MUD-HAT-STD", stock: 0, is_default: true }],
    collections: [],
  },
];

const COLLECTIONS = [
  {
    slug: "everyday-carry", title: "Everyday Carry",
    subtitle: "Bags that hold their shape empty",
    story: "The pieces built to leave the house with you — braided from one continuous rope of kans grass, embroidered by the same hands that wove them.",
    cover_image: "/media/moon-bag-magenta.jpg", sort_order: 1,
  },
  {
    slug: "the-table", title: "The Table",
    subtitle: "Mats, trays, bowls and coasters",
    story: "Texture under the plates. Everything here is coiled or braided from the same grass, so a table set from this collection reads as one thing.",
    cover_image: "/media/braided-table-mats.jpg", sort_order: 2,
  },
  {
    slug: "floor-and-rest", title: "Floor & Rest",
    subtitle: "Mats, poufs and vessels",
    story: "The heavier work — long mats woven in a single pass, and coiled forms that keep their shape without a frame.",
    cover_image: "/media/meditation-mats.jpg", sort_order: 3,
  },
];

const JOURNAL = [
  {
    slug: "from-wild-to-woven", title: "From wild to woven",
    excerpt: "What begins as a grass on a riverbank ends as something you carry every day. The route between the two is longer than it looks.",
    hero_image: "/media/kans-grass-growing.jpg",
    products: ["moon-bag", "ring-handle-tote"],
    body: [
      "Kans grass grows without anyone planting it. It comes up along riverbanks and at the edges of fields, tall enough by the end of the monsoon to disappear into.",
      "Cutting is the easy part. What follows is drying — long enough that the blade stops shrinking, because grass cut and worked too soon will loosen in the weave a month later. Then splitting, by hand, into widths even enough that a braid reads regular across a metre of rope.",
      "Only then does anything that looks like a bag begin. A Moon Bag is one continuous braid, coiled and stitched pass by pass. Around fourteen hours, from a rope to a thing with a handle.",
    ],
  },
  {
    slug: "what-fits-in-the-moon-bag", title: "What fits in the Moon Bag",
    excerpt: "A fair question, and one we get often enough to answer properly.",
    hero_image: "/media/moon-bag-open.jpg",
    products: ["moon-bag"],
    body: [
      "The medium takes a paperback, a one-litre bottle, a folded scarf, sunglasses and a purse, with room left over. The small is a purse-and-phone bag. The large will take a laptop sleeve if you are careful about the corners.",
      "All three hold their shape when empty, which is the point of the braid running unbroken from base to rim. A bag that collapses on a chair is a bag you stop reaching for.",
    ],
  },
  {
    slug: "the-flowers-are-grass-too", title: "The flowers are grass too",
    excerpt: "The embroidery on a clutch is not thread. It is the same material as the bag, dyed in small batches.",
    hero_image: "/media/reed-clutch-colourways.jpg",
    products: ["reed-clutch", "moon-bag"],
    body: [
      "Petals are cut from split fibre, dyed a single colour, then stitched directly through the finished weave rather than onto a backing. A bead goes in at the centre of each bloom.",
      "Because the dye happens in small batches, a colourway rarely repeats exactly. Two marigold clutches made a month apart will not match, and we have stopped treating that as a problem to solve.",
    ],
  },
  {
    slug: "one-pass-mats", title: "A mat is woven in one pass",
    excerpt: "Why pater mats have straight edges, and why no two are exactly the same length.",
    hero_image: "/media/meditation-mats.jpg",
    products: ["meditation-mat", "striped-meditation-mat"],
    body: [
      "Pater is a wetland grass that flattens as it dries. Laid out to full length before any weaving starts, then worked end to end without stopping.",
      "Edges are bound as the weaver reaches them, which is what keeps a mat from splaying after a few months of use. It also means the finished length is decided by the grass rather than by a measurement, so mats vary by a few centimetres.",
    ],
  },
  {
    slug: "gulguliya", title: "Gulguliya, and why it holds a curve",
    excerpt: "A papyrus that grows in standing water, cut by hand so the beds come back.",
    hero_image: "/media/gulguliya-vase-pen-stand.jpg",
    products: ["gulguliya-vase", "gulguliya-pen-stand"],
    body: [
      "Gulguliya is cut by hand, at the waterline, in a way that leaves the bed to regenerate. Machine harvesting would be faster and would not.",
      "Dried, it holds a curve — which is the whole reason a vase coiled from it keeps its waist with nothing inside to hold the shape. The wall is doing structural work that in most vessels a mould would do.",
    ],
  },
  {
    slug: "setting-a-table", title: "Setting a table from one grass",
    excerpt: "Mats, coasters, trays and a bowl, all from the same braid.",
    hero_image: "/media/braided-table-mats.jpg",
    products: ["braided-table-mat", "braided-coaster-set", "woven-serving-bowl", "woven-placemat"],
    body: [
      "Everything on the table here is coiled or braided from kans grass, which is why a table set from this collection reads as one thing rather than a collection of near-matches.",
      "The mats take heat. The coasters take condensation. The bowl takes fruit, bread, or whatever ends up in it by the end of a week.",
    ],
  },
  {
    slug: "why-we-buy-outright", title: "Why we buy outright",
    excerpt: "We pay for stock on delivery, not after it sells. Here is what that changes.",
    hero_image: "/media/kans-grass-growing.jpg",
    products: [],
    body: [
      "A lot of craft retail runs on consignment: the shop takes the stock, pays when it sells, and returns what does not. It is the lower-risk model — for the shop.",
      "We buy outright at a price agreed before anything is made, and pay when the stock arrives. If a piece sits on our shelf for six months, that is our problem and not the weaver's.",
      "It means we carry inventory risk and are slower to expand the range. It also means the people making things are paid on a schedule they can plan around, which is the part that matters.",
    ],
  },
  {
    slug: "care-and-repair", title: "Keeping grass alive indoors",
    excerpt: "Dry, brushed, out of direct sun. Almost everything else is fine.",
    hero_image: "/media/floor-pouf.jpg",
    products: ["floor-pouf", "meditation-mat"],
    body: [
      "Grass objects fail in two ways: they get wet and stay wet, or they dry out in direct sun until the fibre goes brittle. Both are avoidable.",
      "Brush the weave rather than washing it. If something gets soaked, dry it slowly and away from a window. Roll mats, never fold them — a fold becomes a crease and a crease eventually becomes a break.",
      "Handled reasonably, these outlast most of what shares a room with them.",
    ],
  },
];

// -------------------------------------------------------------- execution ---

// Re-seeding rebuilds the catalogue from scratch. That is safe while nothing
// has been sold and destructive the moment something has, because order_items
// reference variants — so refuse outright once real orders exist.
const [{ count: existingOrders }] = await sql`select count(*)::int from orders`;
if (existingOrders > 0 && !process.argv.includes("--force")) {
  console.error(
    `refusing to re-seed: ${existingOrders} order(s) exist and reference this catalogue.\n` +
    `re-run with --force only if you are certain this is a throwaway database.`
  );
  await sql.end();
  process.exit(1);
}

console.log("seeding…");

// TRUNCATE rather than DELETE: the ledger and audit tables carry append-only
// row triggers by design, and TRUNCATE is the intended reset path around them.
await sql.unsafe(`
  truncate table
    collection_products, content_versions, content_pages,
    stock_ledger, stock_intake, stock_levels,
    product_images, product_variants, products,
    collections, categories, craft_techniques, materials, makers, communities
  restart identity cascade
`);

const communityId = {}, makerId = {}, materialId = {}, techniqueId = {}, categoryId = {}, collectionId = {}, productId = {};

for (const c of COMMUNITIES) {
  const [row] = await sql`
    insert into communities ${sql({ ...c, status: "published" })} returning id`;
  communityId[c.slug] = row.id;

  // One workshop-level maker per community. display_name is the community name
  // until real names arrive with consent — no invented people.
  const [m] = await sql`
    insert into makers ${sql({
      slug: c.slug, community_id: row.id, display_name: c.name,
      craft: c.summary, bio: c.story, portrait_image: c.cover_image,
      working_since: c.working_since, status: "published",
    })} returning id`;
  makerId[c.slug] = m.id;
}

for (const m of MATERIALS) {
  const [row] = await sql`insert into materials ${sql({ ...m, status: "published" })} returning id`;
  materialId[m.slug] = row.id;
}

for (const t of TECHNIQUES) {
  // postgres.js serialises objects for jsonb itself. Pre-stringifying stores a
  // JSON *string* instead of an array, so jsonb_typeof reads "string" and every
  // consumer that maps over it fails.
  const [row] = await sql`
    insert into craft_techniques ${sql({ ...t, steps: sql.json(t.steps), status: "published" })} returning id`;
  techniqueId[t.slug] = row.id;
}

for (const c of CATEGORIES) {
  const [row] = await sql`insert into categories ${sql(c)} returning id`;
  categoryId[c.slug] = row.id;
}

for (const c of COLLECTIONS) {
  const [row] = await sql`insert into collections ${sql({ ...c, status: "published" })} returning id`;
  collectionId[c.slug] = row.id;
}

for (const p of PRODUCTS) {
  const status = p.status ?? "published";
  const [row] = await sql`
    insert into products ${sql({
      slug: p.slug, name: p.name, subtitle: p.subtitle, description: p.description,
      care: p.care ?? null,
      category_id: categoryId[p.category],
      maker_id: makerId[p.community], community_id: communityId[p.community],
      material_id: materialId[p.material], technique_id: techniqueId[p.technique],
      labour_hours: p.labour_hours ?? null,
      variation_note: null,
      price_paisa: p.price, maker_share_paisa: null,
      is_food: false, status,
      published_at: status === "published" ? new Date() : null,
      sort_order: PRODUCTS.indexOf(p),
    })} returning id`;
  productId[p.slug] = row.id;

  for (const [i, [file, alt, isScale]] of p.images.entries()) {
    await sql`insert into product_images ${sql({
      product_id: row.id, storage_path: `/media/${file}.jpg`, alt,
      width: 1200, height: 1500, origin: "photograph",
      is_scale_reference: Boolean(isScale) && i === 0 ? false : false,
      sort_order: i,
    })}`;
  }

  // Exactly one default per product: an explicit flag if any variant sets one,
  // otherwise the first. The partial unique index enforces this, so getting it
  // wrong fails the seed rather than shipping an ambiguous product page.
  const defaultIndex = Math.max(0, p.variants.findIndex((v) => v.is_default));

  for (const [i, v] of p.variants.entries()) {
    const [variant] = await sql`insert into product_variants ${sql({
      product_id: row.id, sku: v.sku,
      option_name: v.option_name ?? null, option_value: v.option_value ?? null,
      price_paisa: v.price ?? null,
      is_default: i === defaultIndex,
      sort_order: i,
    })} returning id`;

    // Stock arrives through an intake, because that is how it arrives in real
    // life: MUD buys it, pays for it, and owns it from that moment.
    if (v.stock > 0) {
      const unitPrice = v.price ?? p.price;
      await sql`select record_intake(
        ${variant.id}::uuid, ${makerId[p.community]}::uuid, ${communityId[p.community]}::uuid,
        ${v.stock}::integer, ${Math.round(unitPrice * 0.55)}::integer, ${"SEED-2026-01"}::text)`;
    } else {
      await sql`insert into stock_levels (variant_id, on_hand) values (${variant.id}, 0)
                on conflict (variant_id) do nothing`;
    }
  }

  for (const col of p.collections) {
    await sql`insert into collection_products ${sql({
      collection_id: collectionId[col], product_id: row.id,
      sort_order: PRODUCTS.indexOf(p),
    })}`;
  }
}

for (const [i, post] of JOURNAL.entries()) {
  const [page] = await sql`insert into content_pages ${sql({
    slug: post.slug, kind: "journal", title: post.title,
  })} returning id`;

  const [version] = await sql`insert into content_versions ${sql({
    page_id: page.id,
    blocks: sql.json(post.body.map((text) => ({ type: "paragraph", text }))),
    excerpt: post.excerpt,
    hero_image: post.hero_image,
    author: "MUD Naturals",
    product_ids: post.products.map((s) => productId[s]).filter(Boolean),
    published_at: new Date(Date.now() - i * 86400000 * 9),
  })} returning id`;

  await sql`update content_pages set published_version_id = ${version.id}, draft_version_id = ${version.id}
             where id = ${page.id}`;
}

await sql`select refresh_impact_views()`;

const [{ count: productCount }] = await sql`select count(*)::int from products where status = 'published'`;
const [{ count: variantCount }] = await sql`select count(*)::int from product_variants`;
const [{ sum: onHand }] = await sql`select coalesce(sum(on_hand),0)::int as sum from stock_levels`;

console.log(`
  communities  ${COMMUNITIES.length}
  makers       ${COMMUNITIES.length}  (workshop-level; no personal names until consent)
  materials    ${MATERIALS.length}
  techniques   ${TECHNIQUES.length}
  products     ${productCount} published, ${PRODUCTS.length - productCount} draft
  variants     ${variantCount}
  units        ${onHand} on hand
  journal      ${JOURNAL.length} posts
`);

await sql.end();
