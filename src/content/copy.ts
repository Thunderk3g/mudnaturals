/**
 * Every user-facing string lives here (decision 10: English now, Nepali later
 * without a component rewrite).
 *
 * Copy register, enforced: verbs of making, never verbs of helping. Communities
 * and makers are partners and producers. Banned throughout — help, support,
 * give back, empower, uplift, underprivileged, change lives, beneficiary, and
 * unqualified eco-friendly / green / responsible.
 *
 * Order, also enforced: the community comes first and the maker second. This
 * store sells objects from places it buys from, not profiles of individuals.
 * A maker's name appears where one has agreed to it, under the community that
 * produced the work — never as the headline.
 */

export const copy = {
  brand: {
    name: "MUD Naturals",
    tagline: "Objects with origins",
    description:
      "A curated store for objects with origins — baskets, natural care, and everyday goods from a handful of Nepali communities we buy from directly, each one traceable to the place it came from.",
    philosophy: "People × Nature × Craft × Commerce",
  },

  nav: {
    shop: "Shop",
    collections: "Collections",
    communities: "Communities",
    makers: "Makers",
    journal: "Journal",
    story: "Our Story",
    impact: "Our Impact",
    craft: "Craft",
    about: "About",
    contact: "Contact",
    cart: "Cart",
    search: "Search",
    trackOrder: "Track an order",
    menu: "Menu",
    close: "Close",
  },

  /**
   * What is left of the homepage's copy.
   *
   * The hero, the section headings and the calls to action moved into
   * `page_blocks` when the homepage became editable — they are data now, and
   * keeping a second copy of them here would only let the two drift apart.
   * These are the labels other pages borrow.
   */
  home: {
    collectionTitle: "Collected",
    communityTitle: "Where it comes from",
    journalTitle: "Field notes",
    viewAll: "View all",
  },

  product: {
    addToCart: "Add to cart",
    adding: "Adding…",
    added: "Added to cart",
    soldOut: "Sold out",
    outOfStock: "Currently unavailable",
    lowStock: (n: number) => `Only ${n} left`,
    inStock: "In stock",
    madeToOrder: "Made to order",
    originTrace: "Origin",
    maker: "Maker",
    community: "Community",
    district: "District",
    material: "Material",
    technique: "Technique",
    labour: "Hours of work",
    sku: "SKU",
    dimensions: "Dimensions",
    care: "Care",
    ingredients: "Ingredients",
    details: "Details",
    variationTitle: "No two are identical",
    variationDefault:
      "Hand-worked from a natural material, so colour, grain and dimensions vary between pieces. The variation is the evidence, not a defect.",
    moreFromMaker: (name: string) => `More from ${name}`,
    pairsWith: "Pairs with",
    shippingNote: "Delivery calculated at checkout — Nepal only.",
    deliveryEstimate: "Arrives in 3–5 days inside Kathmandu Valley, 5–8 days elsewhere.",
    reviews: "Reviews",
    noReviews: "No reviews yet.",
    scaleImage: "Shown in scale",
    imageCounter: (i: number, total: number) => `${i} of ${total}`,
    makerShare: (amount: string) => `${amount} of this price goes to the maker.`,
    gallery: "Product images",
  },

  shop: {
    title: "Shop",
    allProducts: "All products",
    grid: "Grid",
    ledger: "Ledger",
    filters: "Filters",
    clearFilters: "Clear all",
    applyFilters: "Show results",
    sortBy: "Sort",
    sortNewest: "Newest",
    sortPriceAsc: "Price, low to high",
    sortPriceDesc: "Price, high to low",
    sortName: "A–Z",
    resultCount: (n: number) => (n === 1 ? "1 object" : `${n} objects`),
    empty: "Nothing matches those filters yet.",
    emptyHelp: "Clear a filter, or browse everything below.",
    searchPlaceholder: "Search objects, makers, materials",
    searchNoResults: (q: string) => `Nothing found for “${q}”.`,
    searchNoResultsHelp: "Try a material, a district, or a maker's name.",
    facetCategory: "Category",
    facetMaterial: "Material",
    facetMaker: "Maker",
    facetPrice: "Price",
  },

  cart: {
    title: "Cart",
    empty: "Your cart is empty.",
    emptyCta: "Browse the shop",
    subtotal: "Subtotal",
    shipping: "Delivery",
    shippingFree: "Free",
    shippingAtCheckout: "Calculated at checkout",
    discount: "Discount",
    total: "Total",
    checkout: "Checkout",
    continueShopping: "Continue shopping",
    remove: "Remove",
    quantity: "Quantity",
    freeShippingProgress: (remaining: string) => `${remaining} away from free delivery`,
    freeShippingReached: "Free delivery unlocked",
    itemCount: (n: number) => (n === 1 ? "1 item" : `${n} items`),
  },

  checkout: {
    title: "Checkout",
    contact: "Contact",
    delivery: "Delivery",
    payment: "Payment",
    orderSummary: "Order summary",
    email: "Email",
    emailOptional: "Email (optional)",
    emailHelp: "For your receipt and order updates.",
    phone: "Phone",
    phoneHelp: "For delivery calls only.",
    fullName: "Full name",
    province: "Province",
    district: "District",
    municipality: "Municipality / ward",
    tole: "Tole / street",
    landmark: "Landmark",
    landmarkHelp: "The nearest recognisable place — couriers navigate by these.",
    isGift: "This is a gift",
    giftNote: "Gift note",
    recipientName: "Recipient's name",
    recipientPhone: "Recipient's phone",
    payWithEsewa: "Pay with eSewa",
    payWithCod: "Cash on delivery",
    codNote: "We will call to confirm before dispatch.",
    codUnavailable: "Cash on delivery is not available for this order.",
    placeOrder: "Place order",
    placing: "Placing order…",
    required: "Required",
    optional: "Optional",
    guestNote: "No account needed. We will send your order link by SMS.",
    errorGeneric: "That did not go through. Nothing has been charged — please try again.",
  },

  order: {
    thanksTitle: "Order placed",
    thanksBody: (n: string) => `Your order ${n} is confirmed. We have sent the details to your phone.`,
    verifyingTitle: "Confirming your payment",
    verifyingBody:
      "eSewa is still settling this transaction. Nothing more is needed from you — this page updates itself, and we will message you the moment it clears.",
    codTitle: "Order received",
    codBody: "We will call to confirm before dispatch. Nothing is charged until delivery.",
    failedTitle: "Payment did not complete",
    failedBody: "Your cart is untouched. You can try again in one tap.",
    retry: "Try payment again",
    orderNumber: "Order number",
    status: "Status",
    placed: "Placed",
    trackingRef: "Tracking",
    lookupTitle: "Find an order",
    lookupHelp: "Paste the link we sent you, or enter your order number and phone.",
    notFound: "We could not find that order.",
  },

  /**
   * Communities are the axis the site is organised on. A community is a place
   * and a group of people who work there — not a profile, not a feed, and not
   * something you follow. The copy stays at that level: what is made, where,
   * since when, and what of it is in the shop today.
   */
  communities: {
    title: "Communities",
    intro:
      "We buy from a small number of communities and go back to the same ones each season. Each page below says where it is, what is made there, and what of it is in the shop today.",
    workingSince: (year: number) => `Buying from here since ${year}`,
    communityCount: (n: number) => (n === 1 ? "1 community" : `${n} communities`),
    theirWork: (name: string) => `Objects from ${name}`,
    recordTitle: "Community record",
    district: "District",
    province: "Province",
    // A lead-in, not a heading: the names run on as a sentence rather than
    // standing up as a roster of profiles.
    makersLead: "Worked here by",
    story: "About this place",
    empty: "No communities are published yet.",
    objectsHere: "In the shop from here",
  },

  makers: {
    title: "Makers",
    intro:
      "The workshops and households behind the objects. We buy through the community, and name the maker where one has agreed to be named.",
    workingSince: (year: number) => `Working with us since ${year}`,
    makerCount: (n: number) => (n === 1 ? "1 maker" : `${n} makers`),
    process: "How it is made",
    theirWork: (name: string) => `Objects by ${name}`,
    communityWork: (name: string) => `Objects from ${name}`,
    inTheirWords: "In their words",
    consentNote:
      "Names, portraits and quotes are published with written, dated permission, and withdrawn on request.",
  },

  impact: {
    title: "Our Impact",
    tradeTitle: "First, the trade",
    tradeBody:
      "We buy stock outright at prices agreed with each maker, and pay on delivery. That payment is the largest share of what we do, and it is not contingent on anything.",
    fundTitle: "Then, the fund",
    fundBody:
      "Eighty percent of the value we generate sustains and grows the enterprise. Twenty percent goes to the MUD Impact Fund — equipment, training and product development, decided with the makers and reported once a year.",
    methodTitle: "How these numbers are made",
    limitationsTitle: "What these numbers do not cover",
    unitsSold: "Objects sold",
    paidToMakers: "Paid to makers",
    makersCount: "Makers",
    communitiesCount: "Communities",
    districtsCount: "Districts",
  },

  journal: {
    title: "Journal",
    intro: "Notes from the workshops, the materials and the places they come from.",
    readMore: "Read",
    shopThisStory: "Shop this story",
    published: "Published",
  },

  craft: {
    title: "Craft & Materials",
    intro: "The plants, fibres and techniques behind everything in the shop.",
    madeWith: "Objects made with this",
    practisedBy: "Practised by",
  },

  footer: {
    newsletter: "Field notes, monthly",
    newsletterHelp: "New objects, new makers. No more than once a month.",
    subscribe: "Subscribe",
    emailPlaceholder: "Your email",
    rights: (year: number) => `© ${year} MUD Naturals. Kathmandu, Nepal.`,
    photographyNote: "Photography note",
    shopHeading: "Shop",
    discoverHeading: "Discover",
    aboutHeading: "About",
    // "Customer care" rather than "Help" or "Support": both of those carry the
    // charity register this brand's copy rules ban, and the distinction is not
    // worth relitigating on every page.
    helpHeading: "Customer care",
    shipping: "Shipping & delivery",
    returns: "Returns",
    trackOrder: "Track order",
    faq: "FAQs",
    privacy: "Privacy",
    terms: "Terms",
  },

  a11y: {
    skipToContent: "Skip to content",
    openMenu: "Open menu",
    closeMenu: "Close menu",
    openCart: "Open cart",
    previousImage: "Previous image",
    nextImage: "Next image",
    loading: "Loading",
    breadcrumb: "Breadcrumb",
  },

  errors: {
    notFoundTitle: "Not here",
    notFoundBody: "That page does not exist. It may have been renamed, or the object may have sold.",
    notFoundCta: "Back to the shop",
    genericTitle: "Something broke",
    genericBody: "That is on us. Try again, and if it keeps happening let us know.",
    tryAgain: "Try again",
  },
} as const;

export type Copy = typeof copy;
