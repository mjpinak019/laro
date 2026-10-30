import { COSMETICS, SLOTS, buyCosmetic, cosmetic, equipCosmetic, ownsCosmetic, type WardrobeSlot } from './wardrobe';
import { COLORS, type Profile } from './store';
import { paintCharacterPreview } from './character-art';

export function mountWardrobe(host: HTMLElement, profile: Profile, changed: () => boolean) {
  let category: WardrobeSlot = 'hat', previewId = profile.wardrobe.equipped.hat;
  const render = () => {
    host.innerHTML = `<section class="wardrobe-shop" aria-label="Wardrobe and coin shop"><div class="shop-intro"><h3>Wardrobe & coin shop</h3><strong id="shop-coins">${profile.coins} coins</strong></div><p class="fine-print">Basics, all skin tones, and boy/girl choices are free. Detailed designs cost more. Everything is cosmetic.</p><div class="shop-layout"><figure class="shop-mannequin"><canvas id="wardrobe-preview" aria-label="Outfit preview"></canvas><figcaption id="wardrobe-preview-label"></figcaption><span id="wardrobe-preview-state"></span></figure><div><div class="shop-categories" aria-label="Clothing category">${SLOTS.map(slot => `<button type="button" data-shop-category="${slot}" aria-pressed="${category === slot}">${slot === 'top' ? 'Clothing' : slot === 'bottom' ? 'Shorts / pants' : slot === 'costume' ? 'Hero / cinema' : slot[0].toUpperCase() + slot.slice(1)}</button>`).join('')}</div><div class="shop-items">${COSMETICS.filter(item => item.slot === category).map(item => {
      const owned = ownsCosmetic(profile.wardrobe, item.id), equipped = profile.wardrobe.equipped[category] === item.id;
      return `<article class="shop-item ${equipped ? 'wearing' : ''}" data-cosmetic="${item.id}"><button type="button" class="try-cosmetic" data-preview-item="${item.id}" aria-label="Preview ${item.name}"><canvas aria-hidden="true"></canvas><strong>${item.name}</strong></button><small>${item.detail}</small><button type="button" data-equip-item="${item.id}" ${equipped || !owned && profile.coins < item.price ? 'disabled' : ''}>${equipped ? 'Wearing' : owned ? item.price ? 'Equip · owned' : 'Equip · free' : `Buy & wear · ${item.price} coins`}</button></article>`;
    }).join('')}</div></div></div><p id="shop-status" role="status" aria-live="polite"></p><p class="fine-print">Original hero and cinema-inspired designs. Signature suits cover your separate top and bottoms; choose My own mix to show them again. Purchases and equipped clothes save immediately.</p></section>`;
    for (const button of host.querySelectorAll<HTMLButtonElement>('[data-shop-category]')) button.onclick = () => { category = button.dataset.shopCategory as WardrobeSlot; previewId = profile.wardrobe.equipped[category]; render(); };
    for (const button of host.querySelectorAll<HTMLButtonElement>('[data-preview-item]')) button.onclick = () => { previewId = button.dataset.previewItem!; paintPreview(); };
    for (const button of host.querySelectorAll<HTMLButtonElement>('[data-equip-item]')) button.onclick = () => {
      const id = button.dataset.equipItem!, owned = ownsCosmetic(profile.wardrobe, id);
      const before = { coins: profile.coins, wardrobe: { owned: [...profile.wardrobe.owned], equipped: { ...profile.wardrobe.equipped } } };
      if (owned ? equipCosmetic(profile.wardrobe, id) : buyCosmetic(profile, id)) {
        previewId = id; const saved = changed();
        if (!saved && !owned) { profile.coins = before.coins; profile.wardrobe = before.wardrobe; changed(); }
        render(); host.querySelector('#shop-status')!.textContent = !saved ? owned ? 'Wearing for this visit. Browser saving is unavailable; download a save file in Settings.' : 'Purchase cancelled: this browser cannot save it. No coins were charged.' : owned ? 'Outfit saved.' : `${cosmetic(id)!.name} purchased and saved. No duplicate charge.`;
      }
    };
    for (const button of host.querySelectorAll<HTMLButtonElement>('[data-preview-item]')) {
      const item = cosmetic(button.dataset.previewItem!)!, outfit = { ...profile.wardrobe.equipped, [item.slot]: item.id };
      if (item.slot === 'top' || item.slot === 'bottom') outfit.costume = 'costume-none';
      paintCharacterPreview(button.querySelector('canvas')!, profile.gender, COLORS[profile.color], 0, 0, outfit);
    }
    paintPreview();
  };
  const paintPreview = () => {
    const item = cosmetic(previewId)!, outfit = { ...profile.wardrobe.equipped, [item.slot]: item.id };
    if (item.slot === 'top' || item.slot === 'bottom') outfit.costume = 'costume-none';
    paintCharacterPreview(host.querySelector('#wardrobe-preview')!, profile.gender, COLORS[profile.color], 0, 0, outfit);
    host.querySelector('#wardrobe-preview-label')!.textContent = item.name;
    host.querySelector('#wardrobe-preview-state')!.textContent = ownsCosmetic(profile.wardrobe, item.id) ? 'Owned / free' : `Preview only · ${item.price} coins`;
  };
  render(); return () => render();
}
