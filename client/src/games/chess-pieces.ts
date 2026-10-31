import type { Color, PieceSymbol } from 'chess.js';

const SHAPES: Record<PieceSymbol, string> = {
  p: '<circle cx="20" cy="12" r="6"/><path d="M16 18h8l-1 9 5 10H12l5-10z"/>',
  n: '<path d="m12 37 2-10-5-3 4-10 6-5 1-5 5 6 6 5-1 12 2 10z"/><path d="m14 18 7-3-4 10m5-11h2" fill="none"/>',
  b: '<path d="M20 4c-11 9-12 16-4 20l-2 8-4 5h20l-4-5-2-8c8-4 7-11-4-20z"/><path d="m17 11 7 9M14 29h12" fill="none"/>',
  r: '<path d="M10 6h5v5h3V6h4v5h3V6h5v12l-5 3 1 12 4 4H10l4-4 1-12-5-3z"/><path d="M12 18h16M14 32h12" fill="none"/>',
  q: '<path d="m9 14 7 6 4-11 4 11 7-6-5 19 5 4H9l5-4z"/><circle cx="9" cy="12" r="3"/><circle cx="20" cy="7" r="3"/><circle cx="31" cy="12" r="3"/><path d="M14 29h12" fill="none"/>',
  k: '<path d="M16 4h8v5h5v6h-6v5c13-8 15 6 5 11l2 6H10l2-6c-10-5-8-19 5-11v-5h-6V9h5z"/><path d="M13 31h14" fill="none"/>',
};
/** Explicit SVG fills avoid Safari rendering chess glyphs as black emoji. */
export function chessPiece(type: PieceSymbol, color: Color) {
  return `<svg class="chess-piece ${color === 'w' ? 'white' : 'black'}" viewBox="0 0 40 46" aria-hidden="true" fill="${color === 'w' ? '#fff5db' : '#17372f'}" stroke="${color === 'w' ? '#384e40' : '#ead4a2'}" stroke-width="1.6" stroke-linejoin="round" stroke-linecap="round">${SHAPES[type]}<path d="M10 37h20l2 5H8z"/></svg>`;
}
