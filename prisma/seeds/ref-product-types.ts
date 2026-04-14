import type { PrismaClient } from '@prisma/client';

/** ISO 9606-1 product type: Plate (P) or Tube/Pipe (T). */
export const productTypes = [
  { id: 1, code: 'P', name: 'Plate', description: '판재' },
  { id: 2, code: 'T', name: 'Tube/Pipe', description: '관재 (파이프/튜브)' },
];

export async function seedProductTypes(prisma: PrismaClient): Promise<number> {
  for (const t of productTypes) {
    await prisma.refProductType.upsert({ where: { id: t.id }, update: t, create: t });
  }
  return productTypes.length;
}
