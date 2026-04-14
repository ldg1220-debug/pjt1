import type { PrismaClient } from '@prisma/client';

/**
 * CEN ISO/TR 15608 — Grouping of metallic materials.
 * Groups referenced by ISO 9606-1 Table 3 (material group cross-approval).
 */
export const materialGroups = [
  // --- Group 1: Non-alloy / low alloy steels ------------------------------
  { id: 11, code: '1.1', parentGroup: '1', name: 'Low-C steel, ReH ≤ 275 MPa',              description: '' },
  { id: 12, code: '1.2', parentGroup: '1', name: 'Low-C steel, 275 < ReH ≤ 360 MPa',        description: '' },
  { id: 13, code: '1.3', parentGroup: '1', name: 'Normalised fine-grained steel ReH > 360', description: '' },
  { id: 14, code: '1.4', parentGroup: '1', name: 'Low-alloy improved corrosion resistance', description: '' },

  // --- Group 2: TMCP fine-grained steels ----------------------------------
  { id: 21, code: '2.1', parentGroup: '2', name: 'TMCP steels ReH ≤ 460 MPa', description: '' },
  { id: 22, code: '2.2', parentGroup: '2', name: 'TMCP steels ReH > 460 MPa', description: '' },

  // --- Group 3: Quenched & tempered steels --------------------------------
  { id: 31, code: '3.1', parentGroup: '3', name: 'Q&T steels ReH ≤ 460 MPa (other than 2)', description: '' },
  { id: 32, code: '3.2', parentGroup: '3', name: 'Q&T steels 460 < ReH ≤ 690 MPa',          description: '' },
  { id: 33, code: '3.3', parentGroup: '3', name: 'Q&T steels ReH > 690 MPa',                description: '' },

  // --- Group 4: Low-V CrMo(Ni) steels -------------------------------------
  { id: 41, code: '4.1', parentGroup: '4', name: 'CrMo(Ni) steels, Mo ≤ 0.7%, V ≤ 0.1%',    description: '' },
  { id: 42, code: '4.2', parentGroup: '4', name: 'CrMoV steels',                             description: '' },

  // --- Group 5: Cr-Mo creep-resistant -------------------------------------
  { id: 51, code: '5.1', parentGroup: '5', name: 'CrMo steel, Cr ≤ 3%, Mo ≤ 0.7%',           description: '' },
  { id: 52, code: '5.2', parentGroup: '5', name: 'CrMo, 3 < Cr ≤ 7%, Mo ≤ 0.7%',             description: '' },
  { id: 53, code: '5.3', parentGroup: '5', name: 'CrMo, 7 < Cr ≤ 10%, Mo ≤ 1.2%',            description: '' },
  { id: 54, code: '5.4', parentGroup: '5', name: 'CrMo, low C, Cr ≤ 3%',                     description: '' },

  // --- Group 6: High Cr-Mo-(Ni) -------------------------------------------
  { id: 61, code: '6.1', parentGroup: '6', name: 'CrMoV, Cr ≤ 3%, V ≤ 0.35%',                description: '' },
  { id: 62, code: '6.2', parentGroup: '6', name: 'CrMoV, 3 < Cr ≤ 7%',                       description: '' },
  { id: 63, code: '6.3', parentGroup: '6', name: 'CrMoV, 7 < Cr ≤ 12.5%',                    description: '' },
  { id: 64, code: '6.4', parentGroup: '6', name: 'CrMoWV',                                    description: '' },

  // --- Group 7: Ferritic/martensitic stainless (Cr 10.5–30) ---------------
  { id: 71, code: '7.1', parentGroup: '7', name: 'Ferritic stainless steels',                description: '' },
  { id: 72, code: '7.2', parentGroup: '7', name: 'Martensitic stainless steels',             description: '' },
  { id: 73, code: '7.3', parentGroup: '7', name: 'Precipitation-hardening stainless steels', description: '' },

  // --- Group 8: Austenitic stainless --------------------------------------
  { id: 81, code: '8.1', parentGroup: '8', name: 'Austenitic SS, Cr ≤ 19%',                  description: '' },
  { id: 82, code: '8.2', parentGroup: '8', name: 'Austenitic SS, Cr > 19%',                  description: '' },
  { id: 83, code: '8.3', parentGroup: '8', name: 'Mn austenitic SS 4 < Mn ≤ 12%',            description: '' },

  // --- Group 9: Ni-alloyed steels -----------------------------------------
  { id: 91, code: '9.1', parentGroup: '9', name: 'Ni steels, Ni ≤ 3%',                       description: '' },
  { id: 92, code: '9.2', parentGroup: '9', name: 'Ni steels, 3 < Ni ≤ 8%',                   description: '' },
  { id: 93, code: '9.3', parentGroup: '9', name: 'Ni steels, 8 < Ni ≤ 10%',                  description: '' },

  // --- Group 10: Duplex stainless -----------------------------------------
  { id: 101, code: '10.1', parentGroup: '10', name: 'Austenitic-ferritic (duplex) SS, Cr ≤ 24%', description: '' },
  { id: 102, code: '10.2', parentGroup: '10', name: 'Austenitic-ferritic (duplex) SS, Cr > 24%', description: '' },

  // --- Group 11: C-steels with additions ----------------------------------
  { id: 111, code: '11.1', parentGroup: '11', name: 'Steels covered in 1.x with 0.25 < C ≤ 0.35%', description: '' },
  { id: 112, code: '11.2', parentGroup: '11', name: 'Steels covered in 1.x with 0.35 < C ≤ 0.5%',  description: '' },

  // --- Groups 21~26: Aluminium --------------------------------------------
  { id: 201, code: '21', parentGroup: '2x', name: 'Pure aluminium ≤ 1% impurities',                description: '' },
  { id: 202, code: '22', parentGroup: '2x', name: 'Non-heat-treatable Al alloys',                  description: '' },
  { id: 203, code: '23', parentGroup: '2x', name: 'Heat-treatable Al alloys (AlMgSi)',             description: '' },
  { id: 204, code: '24', parentGroup: '2x', name: 'Al-Si alloys, Cu ≤ 1%',                         description: '' },
  { id: 205, code: '25', parentGroup: '2x', name: 'Al-Si-Mg-Mn castings',                          description: '' },
  { id: 206, code: '26', parentGroup: '2x', name: 'Al-Zn-Mg alloys',                               description: '' },
];

export async function seedMaterialGroups(prisma: PrismaClient): Promise<number> {
  for (const g of materialGroups) {
    await prisma.refMaterialGroup.upsert({ where: { id: g.id }, update: g, create: g });
  }
  return materialGroups.length;
}
