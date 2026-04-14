/**
 * Rule loader — abstracts how RuleSet payloads are obtained.
 *
 * Two backends:
 *   • loadRulesFromMemory(seedMap)  — for unit tests / CLI playgrounds.
 *   • loadRulesFromDb(prisma, code) — production path against `rule_tables`.
 */

export interface RuleSetRuntime {
  code: string;
  getTable<T = unknown>(tableKey: string): T;
}

export class RuleTableNotFoundError extends Error {
  constructor(tableKey: string) {
    super(`Rule table '${tableKey}' not found in active rule set`);
    this.name = 'RuleTableNotFoundError';
  }
}

// ---------------------------------------------------------------------------
// In-memory loader (used by tests; accepts the seed payload map directly)
// ---------------------------------------------------------------------------

export function loadRulesFromMemory(
  seedMap: Record<string, unknown>,
  code = 'ISO-9606-1-2012',
): RuleSetRuntime {
  return {
    code,
    getTable<T>(tableKey: string): T {
      if (!(tableKey in seedMap)) {
        throw new RuleTableNotFoundError(tableKey);
      }
      return seedMap[tableKey] as T;
    },
  };
}

// ---------------------------------------------------------------------------
// DB loader (production)
// ---------------------------------------------------------------------------

interface PrismaLike {
  ruleSet: {
    findFirst(args: unknown): Promise<{ id: number; code: string } | null>;
  };
  ruleTable: {
    findMany(args: unknown): Promise<Array<{ tableKey: string; payload: unknown }>>;
  };
}

export async function loadRulesFromDb(
  prisma: PrismaLike,
  ruleSetCode?: string,
): Promise<RuleSetRuntime> {
  const where = ruleSetCode ? { code: ruleSetCode } : { isActive: true };
  const ruleSet = await prisma.ruleSet.findFirst({ where });
  if (!ruleSet) {
    throw new Error(
      ruleSetCode
        ? `RuleSet '${ruleSetCode}' not found`
        : 'No active RuleSet configured',
    );
  }

  const tables = await prisma.ruleTable.findMany({
    where: { ruleSetId: ruleSet.id },
  });

  const map: Record<string, unknown> = {};
  for (const row of tables) {
    map[row.tableKey] = row.payload;
  }

  return loadRulesFromMemory(map, ruleSet.code);
}
