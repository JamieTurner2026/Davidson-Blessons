// Workshop catalogue. Bought with oil; free items are always owned.

export type CosmeticSlot = "lamp" | "confetti" | "paper" | "companion";

export interface Cosmetic {
  id: string;
  slot: CosmeticSlot;
  name: string;
  blurb: string;
  price: number;
}

export const COSMETICS: ReadonlyArray<Cosmetic> = [
  { id: "lamp-clay", slot: "lamp", name: "Clay lamp", blurb: "Where every journey starts.", price: 0 },
  { id: "lamp-brass", slot: "lamp", name: "Brass lamp", blurb: "Polished, warm and bright.", price: 60 },
  { id: "lamp-lantern", slot: "lamp", name: "Hanging lantern", blurb: "For walking by night.", price: 120 },
  { id: "lamp-menorah", slot: "lamp", name: "Seven-branch lamp", blurb: "Seven flames, one light.", price: 200 },

  { id: "confetti-squiggles", slot: "confetti", name: "Squiggles", blurb: "Marker scribbles of joy.", price: 0 },
  { id: "confetti-leaves", slot: "confetti", name: "Olive leaves", blurb: "A shower of peace.", price: 40 },
  { id: "confetti-doves", slot: "confetti", name: "Doves", blurb: "Little wings, big news.", price: 80 },
  { id: "confetti-stars", slot: "confetti", name: "Stars & moons", blurb: "As numerous as the stars.", price: 120 },

  { id: "paper-plain", slot: "paper", name: "Plain paper", blurb: "Quiet and clean.", price: 0 },
  { id: "paper-linen", slot: "paper", name: "Linen weave", blurb: "A soft woven texture behind the text.", price: 50 },
  { id: "paper-laid", slot: "paper", name: "Laid lines", blurb: "Like a handmade journal.", price: 90 },

  { id: "companion-none", slot: "companion", name: "Travel alone", blurb: "Just you and the road.", price: 0 },
  { id: "companion-lamb", slot: "companion", name: "Lamb", blurb: "Follows wherever you go.", price: 150 },
  { id: "companion-dove", slot: "companion", name: "Dove", blurb: "Flutters just ahead.", price: 180 },
];

export const DEFAULT_EQUIPPED: Record<CosmeticSlot, string> = {
  lamp: "lamp-clay",
  confetti: "confetti-squiggles",
  paper: "paper-plain",
  companion: "companion-none",
};

export const SLOT_LABELS: Record<CosmeticSlot, string> = {
  lamp: "Lamps",
  confetti: "Celebrations",
  paper: "Reading paper",
  companion: "Companions",
};

export function getCosmetic(id: string): Cosmetic | undefined {
  return COSMETICS.find((item) => item.id === id);
}
