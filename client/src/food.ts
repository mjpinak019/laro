import type { Profile } from './store.ts';
import { foodSvg, type SnackId } from './food-art.ts';
import { playerLevel } from './progression.ts';
import { progressQuest } from './quests.ts';
export const SNACKS: readonly {id:SnackId;name:string;price:number;color:string;detail:string;shop:'street'|'store';level?:number}[] = [
  { id: 'fishball', name: 'Fishball', price: 3, color: '#e2ca8c', detail: 'A skewer with your favorite sauce', shop: 'street' },
  { id: 'kwek-kwek', name: 'Kwek-kwek', price: 5, color: '#e7973d', detail: 'Crispy orange bites', shop: 'street' },
  { id: 'kikiam', name: 'Kikiam', price: 4, color: '#b58650', detail: 'Golden merienda from the cart', shop: 'street' },
  { id: 'taho', name: 'Taho', price: 6, color: '#f1d6aa', detail: 'A cup with arnibal and sago', shop: 'street' },
  { id: 'biscuit', name: 'Biscuits', price: 3, color: '#c4a16a', detail: 'A little sari-sari treat', shop: 'store' },
  { id: 'juice', name: 'Juice', price: 4, color: '#db9b65', detail: 'A cool drink after a game', shop: 'store' },
  {id:'pandesal',name:'Pandesal',price:12,level:2,color:'#d3a363',detail:'Soft bread rolls with toasted crumbs',shop:'store'},
  {id:'banana-cue',name:'Banana cue',price:18,level:4,color:'#bd803c',detail:'Caramel-coated saba on a skewer',shop:'street'},
  {id:'turon',name:'Turon',price:28,level:7,color:'#dbb16a',detail:'Crisp banana rolls with caramel',shop:'street'},
  {id:'puto',name:'Cheese puto',price:40,level:10,color:'#f4e7c3',detail:'Steamed rice cakes with a cheese topping',shop:'store'},
  {id:'halo-halo',name:'Halo-halo',price:70,level:15,color:'#9678ae',detail:'Shaved ice, colorful mix-ins and ube',shop:'street'},
  {id:'bibingka',name:'Bibingka',price:110,level:22,color:'#e3ba70',detail:'Golden rice cake on a banana leaf',shop:'store'},
] as const;
export function buySnack(profile: Profile, id: string): boolean {
  const snack = SNACKS.find(item => item.id === id);
  if (!snack || playerLevel(profile.xp).level<(snack.level??0) || !Number.isFinite(profile.coins) || profile.coins < snack.price) return false;
  profile.coins -= snack.price; profile.snacksEaten++; progressQuest(profile,{kind:'buy',id,shop:snack.shop}); return true;
}
export function snackPicture(id: SnackId) { return foodSvg(id, SNACKS.find(item => item.id === id)!.name); }
