import type { PrismaClient } from '@prisma/client';

/** ISO 9606-1 §7 — test types used on test_records. */
export const testTypes = [
  { id: 1,  code: 'VT',           name: 'Visual Test',           category: 'nde',        description: '육안검사' },
  { id: 2,  code: 'RT',           name: 'Radiographic Test',     category: 'nde',        description: '방사선투과검사' },
  { id: 3,  code: 'UT',           name: 'Ultrasonic Test',       category: 'nde',        description: '초음파검사' },
  { id: 4,  code: 'MT',           name: 'Magnetic Particle Test',category: 'nde',        description: '자분탐상검사' },
  { id: 5,  code: 'PT',           name: 'Penetrant Test',        category: 'nde',        description: '침투탐상검사' },
  { id: 6,  code: 'Bend',         name: 'Bend Test',             category: 'mechanical', description: '굽힘시험' },
  { id: 7,  code: 'Fracture',     name: 'Fracture Test',         category: 'mechanical', description: '파단시험' },
  { id: 8,  code: 'Macro',        name: 'Macroscopic Examination', category: 'mechanical', description: '매크로시험' },
  { id: 9,  code: 'Additional',   name: 'Additional Test',       category: 'other',      description: '추가시험(규격 요건 외)' },
  { id: 10, code: 'JobKnowledge', name: 'Job Knowledge',         category: 'other',      description: '직무지식 평가 (ISO 9606-1 §7.4)' },
];

export async function seedTestTypes(prisma: PrismaClient): Promise<number> {
  for (const t of testTypes) {
    await prisma.refTestType.upsert({ where: { id: t.id }, update: t, create: t });
  }
  return testTypes.length;
}
