export const SLOTS = ['skin', 'hat', 'beard', 'top', 'bottom', 'shoes', 'costume'] as const;
export type WardrobeSlot = typeof SLOTS[number];
import { playerLevel } from './progression.ts';
export type Cosmetic = { id: string; slot: WardrobeSlot; name: string; price: number; detail: string; tint?: string; level?: number };
export const COSMETICS: Cosmetic[] = [
  ...[['warm', 'Warm', '#dda97c'], ['light', 'Light', '#edc5a0'], ['golden', 'Golden', '#d2a06a'], ['morena', 'Morena', '#b47b55'], ['deep', 'Deep', '#88583e'], ['rich', 'Rich', '#644431']].map(([id, name, tint]) => ({ id: `skin-${id}`, slot: 'skin' as const, name, tint, price: 0, detail: 'Always free' })),
  { id: 'hat-none', slot: 'hat', name: 'No hat', price: 0, detail: 'Everyday' },
  { id: 'hat-cap', slot: 'hat', name: 'Barangay cap', price: 45, detail: 'Simple · two-tone brim' },
  { id: 'hat-bucket', slot: 'hat', name: 'Weekend bucket', price: 80, detail: 'Simple · stitched rim' },
  { id: 'hat-adventure', slot: 'hat', name: 'Reel adventurer', price: 160, detail: 'Detailed · cinema explorer fedora' },
  { id: 'hat-astral', slot: 'hat', name: 'Astral helmet', price: 220, detail: 'Detailed · space-film visor' },
  { id: 'beard-none', slot: 'beard', name: 'Clean-shaven', price: 0, detail: 'Everyday' },
  { id: 'beard-stubble', slot: 'beard', name: 'Stubble', price: 40, detail: 'Simple · soft shadow' },
  { id: 'beard-mustache', slot: 'beard', name: 'Classic mustache', price: 55, detail: 'Simple · neat whiskers' },
  { id: 'beard-full', slot: 'beard', name: 'Full beard', price: 100, detail: 'Detailed · layered chin' },
  { id: 'top-tee', slot: 'top', name: 'Everyday tee', price: 0, detail: 'Uses your shirt color' },
  { id: 'top-stripes', slot: 'top', name: 'Sunday stripes', price: 75, detail: 'Simple · contrasting stripes' },
  { id: 'top-varsity', slot: 'top', name: 'Plaza varsity', price: 150, detail: 'Detailed · sleeves and badge' },
  { id: 'top-explorer', slot: 'top', name: 'Expedition vest', price: 180, detail: 'Detailed · movie-adventure pockets' },
  { id: 'bottom-pants', slot: 'bottom', name: 'Everyday pants', price: 0, detail: 'Everyday' },
  { id: 'bottom-shorts', slot: 'bottom', name: 'Playground shorts', price: 0, detail: 'Everyday' },
  { id: 'bottom-cargo', slot: 'bottom', name: 'Trail cargo', price: 95, detail: 'Detailed · side pockets' },
  { id: 'bottom-denim', slot: 'bottom', name: 'Indigo denim', price: 120, detail: 'Detailed · seams and cuffs' },
  { id: 'shoes-basic', slot: 'shoes', name: 'Canvas shoes', price: 0, detail: 'Everyday' },
  { id: 'shoes-slippers', slot: 'shoes', name: 'Tsinelas', price: 0, detail: 'Everyday' },
  { id: 'shoes-sneakers', slot: 'shoes', name: 'Court sneakers', price: 85, detail: 'Simple · bright soles' },
  { id: 'shoes-boots', slot: 'shoes', name: 'Adventure boots', price: 145, detail: 'Detailed · laces and cuffs' },
  { id: 'costume-none', slot: 'costume', name: 'My own mix', price: 0, detail: 'Wear your separate clothes' },
  { id: 'costume-sentinel', slot: 'costume', name: 'Midnight sentinel', price: 320, detail: 'Signature · original masked hero, cape and crest' },
  { id: 'costume-web', slot: 'costume', name: 'Webway scout', price: 420, detail: 'Signature · original web-pattern hero suit' },
  { id: 'costume-ranger', slot: 'costume', name: 'Galaxy ranger', price: 520, detail: 'Signature · original space-film armor and visor' },
  { id: 'costume-clockwork', slot: 'costume', name: 'Clockwork guardian', price: 650, detail: 'Signature · original mechanical movie armor' },
  { id:'hat-bandana',slot:'hat',name:'Kanto bandana',price:120,level:2,detail:'Folded cloth and a simple knot' },
  { id:'top-jersey',slot:'top',name:'Barangay jersey',price:200,level:3,detail:'Team trim and a gold number' },
  { id:'hat-salakot',slot:'hat',name:'Woven salakot',price:280,level:5,detail:'Wide woven brim and cross stitching' },
  { id:'top-barong',slot:'top',name:'Celebration barong',price:500,level:8,detail:'Cream fabric with embroidered panels' },
  { id:'bottom-weave',slot:'bottom',name:'Woven-trim trousers',price:650,level:10,detail:'Indigo cloth and patterned cuffs' },
  { id:'shoes-fiesta',slot:'shoes',name:'Fiesta shoes',price:700,level:12,detail:'Two-tone leather, gold trim and bright soles' },
  { id:'top-fiesta',slot:'top',name:'Fiesta jacket',price:950,level:14,detail:'Layered teal, coral panels and gold stitching' },
  { id:'beard-braid',slot:'beard',name:'Braided beard',price:800,level:16,detail:'Layered braid with a gold tie' },
  { id:'hat-lantern',slot:'hat',name:'Lantern keeper',price:1200,level:18,detail:'Brim, tassels and a tiny glowing lantern' },
  { id:'costume-bayani',slot:'costume',name:'Bayanihan guardian',price:2200,level:20,detail:'Original sun crest, blue cape and layered armor' },
  { id:'hat-parol',slot:'hat',name:'Parol crown',price:2800,level:24,detail:'A star crown with colored rays and tassels' },
  { id:'costume-parol',slot:'costume',name:'Parol voyager',price:3800,level:26,detail:'Original star armor, woven sash and luminous trim' },
  { id:'costume-haribon',slot:'costume',name:'Haribon legend',price:6000,level:30,detail:'Original feather mantle, gold crown and eagle crest' },
];
export const DEFAULT_EQUIPPED: Record<WardrobeSlot, string> = { skin: 'skin-warm', hat: 'hat-none', beard: 'beard-none', top: 'top-tee', bottom: 'bottom-pants', shoes: 'shoes-basic', costume: 'costume-none' };
export type Wardrobe = { owned: string[]; equipped: Record<WardrobeSlot, string> };
export const freshWardrobe = (): Wardrobe => ({ owned: [], equipped: { ...DEFAULT_EQUIPPED } });
export const cosmetic = (id: string) => COSMETICS.find(item => item.id === id);
export const ownsCosmetic = (wardrobe: Wardrobe, id: string) => { const item = cosmetic(id); return Boolean(item && (item.price === 0 || wardrobe.owned.includes(id))); };
export function normalizeWardrobe(raw: unknown): Wardrobe {
  const result = freshWardrobe();
  if (!raw || typeof raw !== 'object') return result;
  const source = raw as Partial<Wardrobe>;
  result.owned = Array.isArray(source.owned) ? [...new Set(source.owned.filter((id): id is string => typeof id === 'string' && Boolean(cosmetic(id)?.price)))].slice(0, 100) : [];
  for (const slot of SLOTS) { const id = source.equipped?.[slot]; if (typeof id === 'string' && cosmetic(id)?.slot === slot && ownsCosmetic(result, id)) result.equipped[slot] = id; }
  return result;
}
export function buyCosmetic(profile: { coins: number; wardrobe: Wardrobe; xp?:number }, id: string): boolean {
  const item = cosmetic(id);
  if (!item || ownsCosmetic(profile.wardrobe, id) || playerLevel(profile.xp??0).level<(item.level??0) || !Number.isFinite(profile.coins) || profile.coins < item.price) return false;
  profile.coins -= item.price; profile.wardrobe.owned.push(item.id); profile.wardrobe.equipped[item.slot] = id; return true;
}
export function equipCosmetic(wardrobe: Wardrobe, id: string): boolean {
  const item = cosmetic(id); if (!item || !ownsCosmetic(wardrobe, id)) return false;
  wardrobe.equipped[item.slot] = id; return true;
}
