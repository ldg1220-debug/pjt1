import type { PrismaClient } from '@prisma/client';

/**
 * ISO 4063 — Welding process numerical codes.
 * Only the codes relevant to ISO 9606-1 are bootstrapped here.
 */
export const weldingProcesses = [
  { id: 111, code: '111', name: '피복아크용접', nameEn: 'SMAW / MMA — Manual metal arc welding', category: 'arc' },
  { id: 114, code: '114', name: '셀프쉴드 플럭스코어드 아크용접', nameEn: 'Self-shielded tubular-cored arc welding', category: 'arc' },
  { id: 121, code: '121', name: '서브머지드 아크용접 (솔리드와이어)', nameEn: 'Submerged arc welding with solid wire', category: 'saw' },
  { id: 122, code: '122', name: '서브머지드 아크용접 (스트립)', nameEn: 'Submerged arc welding with strip electrode', category: 'saw' },
  { id: 135, code: '135', name: 'MAG (솔리드와이어)', nameEn: 'MAG welding with solid wire (GMAW)', category: 'gmaw' },
  { id: 136, code: '136', name: '가스실드 플럭스코어드 아크용접', nameEn: 'Tubular cored metal arc welding with active gas shield (FCAW)', category: 'fcaw' },
  { id: 138, code: '138', name: '가스실드 메탈코어드 아크용접', nameEn: 'Tubular cored metal arc welding with metal powder and active gas shield', category: 'fcaw' },
  { id: 141, code: '141', name: 'TIG (솔리드와이어/봉)', nameEn: 'TIG welding with solid filler (GTAW)', category: 'gtaw' },
  { id: 142, code: '142', name: 'TIG (무용접봉)', nameEn: 'Autogenous TIG welding (no filler)', category: 'gtaw' },
  { id: 143, code: '143', name: 'TIG (튜뷸러 필러)', nameEn: 'TIG welding with tubular cored filler', category: 'gtaw' },
  { id: 145, code: '145', name: 'TIG (환원가스 혼합)', nameEn: 'TIG welding with reducing gas and solid filler', category: 'gtaw' },
  { id: 15,  code: '15',  name: '플라즈마 아크용접', nameEn: 'Plasma arc welding', category: 'arc' },
  { id: 311, code: '311', name: '산소-아세틸렌 가스용접', nameEn: 'Oxy-acetylene welding (OFW)', category: 'gas' },
];

export async function seedWeldingProcesses(prisma: PrismaClient): Promise<number> {
  for (const p of weldingProcesses) {
    await prisma.refWeldingProcess.upsert({
      where: { id: p.id },
      update: p,
      create: p,
    });
  }
  return weldingProcesses.length;
}
