import type { Category, Difficulty, Kind, L10n } from "../../src/game/locale";

export type Fact = {
  id: string;
  category: Category;
  kind: Kind;
  difficulty: Difficulty;
  placeId: string;
  /** When false, the clue is allowed to name the place, because the place is the landmark. */
  conceal: boolean;
  subject: L10n;
  story: L10n;
};
