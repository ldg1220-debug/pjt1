import type { PrismaClient } from '@prisma/client';

/**
 * ISO 6947 welding positions referenced by ISO 9606-1.
 * H-L045 / J-L045 are pipe-specific (pipe axis inclined 45°).
 */
export const positions = [
  { id: 1, code: 'PA',     name: 'Flat (downhand)',            appliesTo: 'both' },
  { id: 2, code: 'PB',     name: 'Horizontal-vertical fillet', appliesTo: 'both' },
  { id: 3, code: 'PC',     name: 'Horizontal',                 appliesTo: 'both' },
  { id: 4, code: 'PD',     name: 'Horizontal overhead fillet', appliesTo: 'both' },
  { id: 5, code: 'PE',     name: 'Overhead',                   appliesTo: 'both' },
  { id: 6, code: 'PF',     name: 'Vertical up',                appliesTo: 'both' },
  { id: 7, code: 'PG',     name: 'Vertical down',              appliesTo: 'both' },
  { id: 8, code: 'H-L045', name: 'Pipe axis 45° — uphill',     appliesTo: 'pipe' },
  { id: 9, code: 'J-L045', name: 'Pipe axis 45° — downhill',   appliesTo: 'pipe' },
];

export async function seedPositions(prisma: PrismaClient): Promise<number> {
  for (const p of positions) {
    await prisma.refPosition.upsert({ where: { id: p.id }, update: p, create: p });
  }
  return positions.length;
}
