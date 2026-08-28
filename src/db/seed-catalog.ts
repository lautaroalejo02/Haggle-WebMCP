type ListingSeed = {
  id: string;
  sellerPersonaId: string;
  title: string;
  description: string;
  condition: string;
  neighborhood: string;
  photoUrl: string;
  askingPriceCents: number;
  floorPriceCents: number;
  status: "active";
  allowsPickup: boolean;
  allowsDelivery: boolean;
  deliveryFeeCents: number;
};

const SELLERS = {
  firm: "11111111-1111-4111-8111-111111111111",
  eager: "22222222-2222-4222-8222-222222222222",
  haggler: "33333333-3333-4333-8333-333333333333",
} as const;

function bicycle(
  sequence: number,
  sellerPersonaId: string,
  title: string,
  description: string,
  condition: string,
  neighborhood: string,
  askingPriceCents: number,
  floorPriceCents: number,
  allowsDelivery: boolean,
  deliveryFeeCents = allowsDelivery ? 1_500 : 0,
): ListingSeed {
  const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  return {
    id: `10000000-0000-4000-8000-${String(sequence).padStart(12, "0")}`,
    sellerPersonaId,
    title,
    description,
    condition,
    neighborhood,
    photoUrl: `https://picsum.photos/seed/haggle-${slug}/1200/900`,
    askingPriceCents,
    floorPriceCents,
    status: "active",
    allowsPickup: true,
    allowsDelivery,
    deliveryFeeCents,
  };
}

export const additionalListingRows = [
  bicycle(10, SELLERS.eager, "Marin Fairfax 1 Fitness Bike", "Light aluminum fitness bike with a wide gear range, fresh grips, and recently adjusted brakes.", "Very good", "East Market", 26_000, 21_500, true, 1_200),
  bicycle(11, SELLERS.firm, "Electra Townie 7D Cruiser", "Comfortable flat-foot cruiser with seven speeds, swept bars, and a clean step-through frame.", "Excellent", "Lakeside", 27_500, 24_000, false),
  bicycle(12, SELLERS.haggler, "Kona Dew Plus Urban Bike", "Stable city bike with hydraulic discs, wide tires, and mounts for racks or fenders.", "Very good", "Riverside", 48_000, 40_000, true, 1_800),
  bicycle(13, SELLERS.firm, "Surly Cross-Check Frameset Build", "Steel all-road build with bar-end shifting, durable wheels, and room for larger tires.", "Good", "Old Town", 49_500, 44_000, false),
  bicycle(14, SELLERS.eager, "Retrospec Beaumont City Bike", "Upright seven-speed city bicycle with fenders, rear rack, and matching chain guard.", "Good", "University", 14_500, 10_500, true, 1_000),
  bicycle(15, SELLERS.haggler, "Trek Marlin 5 Mountain Bike", "Entry trail hardtail with 29-inch wheels, dependable drivetrain, and recently serviced fork.", "Very good", "Hillcrest", 42_500, 35_000, false),
  bicycle(16, SELLERS.firm, "Co-op Cycles CTY 1.1", "Practical hybrid with hydraulic brakes, ergonomic grips, and puncture-resistant commuter tires.", "Excellent", "North Loop", 36_000, 31_500, true, 1_500),
  bicycle(17, SELLERS.haggler, "State Bicycle 4130 Road", "Steel drop-bar bike with simple gearing, lively handling, and a recently replaced chain.", "Good", "Arts District", 32_500, 26_000, true, 1_200),
  bicycle(18, SELLERS.eager, "Raleigh Cadent 2 Hybrid", "Quick flat-bar hybrid with reflective tires, bottle cages, and a compact frame pump.", "Very good", "Midtown", 23_000, 18_500, true, 1_200),
  bicycle(19, SELLERS.firm, "Liv Alight 3 Step-Through", "Easy-handling fitness bike with low standover height and a smooth-shifting triple drivetrain.", "Very good", "Maplewood", 21_000, 18_000, false),
  bicycle(20, SELLERS.haggler, "Priority Classic Plus Belt Drive", "Low-maintenance three-speed city bike with a quiet belt drive and full fenders.", "Excellent", "Downtown", 39_000, 32_500, true, 1_500),
  bicycle(21, SELLERS.eager, "Peugeot UO-8 Vintage Road Bike", "Classic lugged steel road bicycle with upgraded brake pads and tasteful period components.", "Fair", "Old Town", 20_000, 14_500, false),
  bicycle(22, SELLERS.firm, "Diamondback Haanjo 2 Gravel", "Versatile gravel bike with mechanical discs, flared bars, and fast mixed-surface tires.", "Very good", "Station Quarter", 47_000, 41_000, true, 2_000),
  bicycle(23, SELLERS.haggler, "Salsa Journeyman Flat Bar", "Adventure-ready aluminum bike with wide gearing, frame mounts, and tubeless-compatible wheels.", "Good", "Riverside", 49_000, 41_500, false),
  bicycle(24, SELLERS.firm, "Bianchi Pista Steel", "Responsive steel single-speed with a flip-flop hub, fresh tires, and classic celeste details.", "Very good", "Arts District", 35_000, 30_000, true, 1_200),
  bicycle(25, SELLERS.eager, "Public C7 Step-Through", "Colorful upright commuter with seven gears, full fenders, and an integrated rear rack.", "Excellent", "Lakeside", 28_500, 23_000, true, 1_500),
  bicycle(26, SELLERS.haggler, "RadMission City E-Bike", "Simple pedal-assist commuter with charger, working lights, and a recently inspected battery.", "Good", "East Market", 49_500, 40_000, false),
  bicycle(27, SELLERS.eager, "Strider 14x Kids Bike", "Convertible balance-to-pedal bike with lightweight frame and adjustable seat for growing riders.", "Very good", "Maplewood", 10_000, 7_500, true, 800),
  bicycle(28, SELLERS.firm, "Nishiki Pueblo Mountain Bike", "Dependable recreational hardtail with 26-inch wheels and newly replaced shift cables.", "Good", "Hillcrest", 17_500, 14_500, false),
  bicycle(29, SELLERS.haggler, "Breezer Uptown 8 Commuter", "Fully equipped commuter with internal gearing, dynamo lights, fenders, rack, and chain guard.", "Excellent", "North Loop", 44_000, 37_000, true, 1_800),
] satisfies ListingSeed[];
