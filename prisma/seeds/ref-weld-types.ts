import type { PrismaClient } from '@prisma/client';

/** ISO 9606-1 weld type: Butt weld (BW) vs Fillet weld (FW). */
export const weldTypes = [
  { id: 1, code: 'BW', name: 'Butt Weld', description: '맞대기 용접' },
  { id: 2, code: 'FW', name: 'Fillet Weld', description: '필릿 용접' },
];

export async function seedWeldTypes(prisma: PrismaClient): Promise<number> {
  for (const t of weldTypes) {
    await prisma.refWeldType.upsert({ where: { id: t.id }, update: t, create: t });
  }
  return weldTypes.length;
}
