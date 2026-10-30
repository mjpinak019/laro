export const PHONE_SPOTS = [
  { id: 'west-lane', x: 260, y: 940, cover: 'Beside the lane, exposed on the ground' },
  { id: 'plaza-corner', x: 860, y: 464, cover: 'On the eastern edge of the plaza' },
  { id: 'table-back', x: 568, y: 870, cover: 'Tucked behind the table courtyard' },
  { id: 'garden-path', x: 1350, y: 945, cover: 'On the quiet path behind the garden' },
  { id: 'school-side', x: 980, y: 350, cover: 'In the grass beside the school road' },
  { id: 'back-corner', x: 1515, y: 875, cover: 'Hidden in the far garden corner' },
] as const;
export function choosePhoneSpot(random = Math.random, previous?: string) {
  const spots = PHONE_SPOTS.filter(spot => spot.id !== previous);
  return spots[Math.max(0, Math.min(spots.length - 1, Math.floor(random() * spots.length)))];
}
let pageSpot: typeof PHONE_SPOTS[number] | undefined;
export function phoneSpotForPage() {
  if (pageSpot) return pageSpot;
  let previous: string | undefined; try { previous = sessionStorage.getItem('laro.phone.last-spot') ?? undefined; } catch { /* Placement still works without session storage. */ }
  pageSpot = choosePhoneSpot(Math.random, previous);
  try { sessionStorage.setItem('laro.phone.last-spot', pageSpot.id); } catch { /* No persistent location is required. */ }
  return pageSpot;
}
