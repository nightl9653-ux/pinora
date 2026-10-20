import { cityFacts } from "./city";
import { filmFacts } from "./film";
import { foodFacts } from "./food";
import { historyFacts } from "./history";
import { musicFacts } from "./music";
import type { Fact } from "./types";

export const facts: Fact[] = [
  ...foodFacts,
  ...filmFacts,
  ...musicFacts,
  ...cityFacts,
  ...historyFacts,
];

const byId = new Map(facts.map((fact) => [fact.id, fact]));

export function factById(id: string): Fact {
  const fact = byId.get(id);
  if (!fact) throw new Error(`missing fact ${id}`);
  return fact;
}
