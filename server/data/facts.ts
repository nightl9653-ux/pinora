import type { Fact } from "./types";
import { spellFacts } from "./spell";
import { spellExtraFacts } from "./spellExtra";

export const facts: Fact[] = [...spellFacts, ...spellExtraFacts];

const byId = new Map(facts.map((fact) => [fact.id, fact]));

export function factById(id: string): Fact {
  const fact = byId.get(id);
  if (!fact) throw new Error(`missing fact ${id}`);
  return fact;
}
