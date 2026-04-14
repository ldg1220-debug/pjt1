import type { PrismaClient } from '@prisma/client';

/** ISO 9606-1 filler designations (single-letter codes). */
export const fillerDesignations = [
  { id: 1,  code: 'S', name: 'Solid wire/rod/filler',             description: 'Solid wire, rod or solid filler material' },
  { id: 2,  code: 'M', name: 'Metal-cored wire',                  description: 'Tubular cored with metal powder' },
  { id: 3,  code: 'B', name: 'Basic flux-cored wire',             description: 'Tubular cored with basic flux' },
  { id: 4,  code: 'R', name: 'Rutile slow-freezing slag',         description: 'Rutile flux-cored wire, slow-freezing slag' },
  { id: 5,  code: 'P', name: 'Rutile fast-freezing slag',         description: 'Rutile flux-cored wire, fast-freezing slag' },
  { id: 6,  code: 'V', name: 'Rutile or basic/fluoride',          description: 'Combined rutile/basic flux-cored wire' },
  { id: 7,  code: 'W', name: 'Basic fluoride self-shielded',      description: 'Self-shielded basic fluoride cored wire' },
  { id: 8,  code: 'Y', name: 'Other self-shielded',               description: 'Other types of self-shielded cored wire' },
  { id: 9,  code: 'Z', name: 'Other filler',                      description: 'Other types not otherwise classified' },
  { id: 10, code: 'N', name: 'No filler',                         description: 'Autogenous welding (no filler material)' },
];

export async function seedFillerDesignations(prisma: PrismaClient): Promise<number> {
  for (const d of fillerDesignations) {
    await prisma.refFillerDesignation.upsert({ where: { id: d.id }, update: d, create: d });
  }
  return fillerDesignations.length;
}
