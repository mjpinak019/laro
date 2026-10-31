import type { Profile } from './store.ts';
export const SNACKS = [
  { id: 'fishball', name: 'Fishball', price: 3, color: '#e2ca8c', detail: 'A skewer with your favorite sauce', shop: 'street' },
  { id: 'kwek-kwek', name: 'Kwek-kwek', price: 5, color: '#e7973d', detail: 'Crispy orange bites', shop: 'street' },
  { id: 'kikiam', name: 'Kikiam', price: 4, color: '#b58650', detail: 'Golden merienda from the cart', shop: 'street' },
  { id: 'taho', name: 'Taho', price: 6, color: '#f1d6aa', detail: 'A cup with arnibal and sago', shop: 'street' },
  { id: 'biscuit', name: 'Biscuits', price: 3, color: '#c4a16a', detail: 'A little sari-sari treat', shop: 'store' },
  { id: 'juice', name: 'Juice', price: 4, color: '#db9b65', detail: 'A cool drink after a game', shop: 'store' },
] as const;
export function buySnack(profile: Profile, id: string): boolean {
  const snack = SNACKS.find(item => item.id === id);
  if (!snack || !Number.isFinite(profile.coins) || profile.coins < snack.price) return false;
  profile.coins -= snack.price; profile.snacksEaten++; return true;
}
export function snackPicture(color: string) { return `<svg viewBox="0 0 100 80" aria-hidden="true"><path d="m25 70 45-55" stroke="#9c7c4d" stroke-width="4"/><g fill="${color}" stroke="#5f6947" stroke-width="2"><circle cx="38" cy="53" r="12"/><circle cx="53" cy="36" r="12"/><circle cx="68" cy="19" r="12"/></g></svg>`; }
