export type DemoListing = {
  id: string;
  title: string;
  description: string;
  condition: string;
  neighborhood: string;
  photoUrl: string;
  askingPriceCents: number;
  status: "active" | "sold";
  allowsPickup: boolean;
  allowsDelivery: boolean;
  deliveryFeeCents: number;
  seller: {
    id: string;
    name: string;
    avatarEmoji: string;
    styleDescription: string;
  };
  meetingPlaces: Array<{ id: string; name: string; neighborhood: string }>;
  deliveryZones: Array<{ id: string; name: string }>;
  timeWindows: Array<{ id: string; label: string }>;
  accessories: Array<{ id: string; name: string }>;
};

const standardOptions = {
  meetingPlaces: [
    { id: "riverside-library", name: "Riverside Library", neighborhood: "Riverside" },
    { id: "central-station-plaza", name: "Central Station Plaza", neighborhood: "Downtown" },
  ],
  deliveryZones: [
    { id: "downtown", name: "Downtown" },
    { id: "riverside", name: "Riverside" },
  ],
  timeWindows: [
    { id: "sat-10-12", label: "Saturday, 10 AM–12 PM" },
    { id: "sat-2-4", label: "Saturday, 2–4 PM" },
    { id: "sun-11-1", label: "Sunday, 11 AM–1 PM" },
  ],
};

const sellers = {
  hank: {
    id: "33333333-3333-4333-8333-333333333333",
    name: "Haggler Hank",
    avatarEmoji: "🤝",
    styleDescription: "Warm, playful, and guaranteed to counter at least once.",
  },
  fiona: {
    id: "11111111-1111-4111-8111-111111111111",
    name: "Firm Fiona",
    avatarEmoji: "🧭",
    styleDescription: "Direct and courteous. Moves in small, considered steps.",
  },
  eli: {
    id: "22222222-2222-4222-8222-222222222222",
    name: "Easygoing Eli",
    avatarEmoji: "⚡",
    styleDescription: "Quick to find a practical deal, especially for pickup today.",
  },
};

export const demoListings: DemoListing[] = [
  {
    id: "10000000-0000-4000-8000-000000000001",
    title: "Moss Green Trek FX 2",
    description:
      "Light, dependable city hybrid with a recent tune-up, crisp brakes, and a few honest frame marks. The U-lock can be part of the right deal.",
    condition: "Excellent",
    neighborhood: "Riverside",
    photoUrl: "/images/moss-green-hybrid.png",
    askingPriceCents: 22_000,
    status: "active",
    allowsPickup: true,
    allowsDelivery: true,
    deliveryFeeCents: 1_500,
    seller: sellers.hank,
    ...standardOptions,
    accessories: [
      { id: "u-lock", name: "U-lock" },
      { id: "lights", name: "Front and rear lights" },
    ],
  },
  {
    id: "10000000-0000-4000-8000-000000000002",
    title: "Cannondale Quick 5 Commuter",
    description:
      "A fast aluminum commuter with puncture-resistant tires and recently replaced cables. Best for riders around 5'8\"–6'0\".",
    condition: "Very good",
    neighborhood: "North Loop",
    photoUrl: "https://picsum.photos/seed/haggle-cannondale/1200/900",
    askingPriceCents: 30_000,
    status: "active",
    allowsPickup: true,
    allowsDelivery: false,
    deliveryFeeCents: 0,
    seller: sellers.fiona,
    ...standardOptions,
    deliveryZones: [],
    accessories: [{ id: "helmet", name: "Helmet" }],
  },
  {
    id: "10000000-0000-4000-8000-000000000003",
    title: "Blue Schwinn Wayfarer",
    description:
      "Comfortable seven-speed step-through with fenders and a rear rack. Ready for errands, campus, or relaxed weekend rides.",
    condition: "Good",
    neighborhood: "Downtown",
    photoUrl: "https://picsum.photos/seed/haggle-schwinn/1200/900",
    askingPriceCents: 12_500,
    status: "active",
    allowsPickup: true,
    allowsDelivery: true,
    deliveryFeeCents: 1_000,
    seller: sellers.eli,
    ...standardOptions,
    accessories: [{ id: "saddle-bag", name: "Saddle bag" }],
  },
  {
    id: "10000000-0000-4000-8000-000000000004",
    title: "Specialized Rockhopper 29",
    description:
      "Trail-capable hardtail with hydraulic discs and grippy 29-inch tires. Scratches from use, mechanically confident.",
    condition: "Good",
    neighborhood: "Hillcrest",
    photoUrl: "https://picsum.photos/seed/haggle-rockhopper/1200/900",
    askingPriceCents: 40_000,
    status: "active",
    allowsPickup: true,
    allowsDelivery: false,
    deliveryFeeCents: 0,
    seller: sellers.hank,
    ...standardOptions,
    deliveryZones: [],
    accessories: [{ id: "u-lock", name: "U-lock" }],
  },
  {
    id: "10000000-0000-4000-8000-000000000005",
    title: "Fuji Feather Single Speed",
    description:
      "Minimal steel city bike with responsive handling and fresh bar tape. Flip-flop hub is currently set to freewheel.",
    condition: "Very good",
    neighborhood: "Arts District",
    photoUrl: "https://picsum.photos/seed/haggle-fuji/1200/900",
    askingPriceCents: 24_000,
    status: "active",
    allowsPickup: true,
    allowsDelivery: true,
    deliveryFeeCents: 1_200,
    seller: sellers.eli,
    ...standardOptions,
    accessories: [{ id: "lights", name: "Front and rear lights" }],
  },
  {
    id: "10000000-0000-4000-8000-000000000006",
    title: "Vintage Raleigh Sports 3-Speed",
    description:
      "Classic upright Raleigh with working Sturmey-Archer hub, original fenders, and a lovely lived-in patina.",
    condition: "Fair",
    neighborhood: "Old Town",
    photoUrl: "https://picsum.photos/seed/haggle-raleigh/1200/900",
    askingPriceCents: 18_000,
    status: "active",
    allowsPickup: true,
    allowsDelivery: false,
    deliveryFeeCents: 0,
    seller: sellers.fiona,
    ...standardOptions,
    deliveryZones: [],
    accessories: [{ id: "helmet", name: "Helmet" }],
  },
];

export function getDemoListing(id: string): DemoListing | undefined {
  return demoListings.find((listing) => listing.id === id);
}
