import type { PrismaClient } from '@prisma/client';

/**
 * ISO 9606-1 Table 7 — weld detail (side / backing) coding.
 * ss = single side, bs = both sides, nb = no backing, mb = with backing.
 */
export const weldDetails = [
  { id: 1, code: 'ss nb', name: 'Single side, no backing',   description: '한쪽 용접, 백킹 없음 (가장 넓은 승인 범위)' },
  { id: 2, code: 'ss mb', name: 'Single side, with backing', description: '한쪽 용접, 백킹 있음' },
  { id: 3, code: 'bs',    name: 'Both sides',                description: '양면 용접' },
];

export async function seedWeldDetails(prisma: PrismaClient): Promise<number> {
  for (const d of weldDetails) {
    await prisma.refWeldDetail.upsert({ where: { id: d.id }, update: d, create: d });
  }
  return weldDetails.length;
}
