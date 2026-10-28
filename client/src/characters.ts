// Change display names here to keep the village, bots, menus, and dialogue in sync.
export const CHARACTERS = {
  audrey: 'Audrey',
  mj: 'MJ',
  ferdie: 'Ferdie',
  sheena: 'Sheena',
  mamaShoni: 'Mama Shoni',
  tatayEfren: 'Tatay Efren',
  weng: 'Weng',
} as const;
export const DEFAULT_PLAYER_NAME = 'Ikaw';
export type AvatarGender = 'boy' | 'girl';
export type CharacterLook = AvatarGender | 'mama-shoni' | 'tatay-efren' | 'ferdie' | 'mj' | 'audrey' | 'sheena' | 'weng';
export type CharacterId = keyof typeof CHARACTERS;
export const BOT_APPEARANCES: Record<CharacterId, { look: CharacterLook; color: number; gender: AvatarGender; elderly: boolean }> = {
  mamaShoni: { look: 'mama-shoni', color: 4, gender: 'girl', elderly: true },
  tatayEfren: { look: 'tatay-efren', color: 1, gender: 'boy', elderly: true },
  ferdie: { look: 'ferdie', color: 3, gender: 'boy', elderly: false },
  sheena: { look: 'sheena', color: 2, gender: 'girl', elderly: false },
  mj: { look: 'mj', color: 1, gender: 'boy', elderly: false },
  audrey: { look: 'audrey', color: 0, gender: 'girl', elderly: false },
  weng: { look: 'weng', color: 3, gender: 'girl', elderly: false },
};
export const characterTexture = (look: CharacterLook, color: number, direction = 0, frame = 0) => `person-${look}-${color}-${direction}-${frame}`;
