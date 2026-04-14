import type { PrismaClient } from '@prisma/client';

/**
 * ISO 9606-1 Table 2 — Filler material groups (FM1..FM7).
 */
export const fillerGroups = [
  { id: 1, code: 'FM1', name: 'Non-alloy and low-alloy steels',            description: 'Rm ≤ 360 MPa (matches material groups 1, 2, part of 7, part of 9, part of 11)' },
  { id: 2, code: 'FM2', name: 'Low/medium-alloy high-strength steels',      description: 'Rm > 360 MPa up to fine-grained steels' },
  { id: 3, code: 'FM3', name: 'Alloyed creep-resistant steels Cr ≤ 3.75%', description: 'Includes groups 5 & 6 (some)' },
  { id: 4, code: 'FM4', name: 'High Cr creep-resistant steels Cr > 3.75%', description: '' },
  { id: 5, code: 'FM5', name: 'Austenitic / austenitic-ferritic stainless steels', description: 'Group 8 and 10' },
  { id: 6, code: 'FM6', name: 'Nickel and nickel alloys',                   description: 'Group 41~48' },
  { id: 7, code: 'FM7', name: 'Aluminium and its alloys',                   description: 'Groups 21~26' },
];

export async function seedFillerGroups(prisma: PrismaClient): Promise<number> {
  for (const g of fillerGroups) {
    await prisma.refFillerGroup.upsert({ where: { id: g.id }, update: g, create: g });
  }
  return fillerGroups.length;
}
