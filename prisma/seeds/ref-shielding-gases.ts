import type { PrismaClient } from '@prisma/client';

/**
 * EN ISO 14175 — Shielding gases for arc welding.
 * Grouped by first letter: I (inert), M (oxidising mix), C (CO2-rich), R (reducing), N (nitrogen), O (oxygen).
 */
export const shieldingGases = [
  // --- I: Inert -----------------------------------------------------------
  { id: 1,  code: 'I1', groupCode: 'I', name: 'Argon',           composition: '100% Ar' },
  { id: 2,  code: 'I2', groupCode: 'I', name: 'Helium',          composition: '100% He' },
  { id: 3,  code: 'I3', groupCode: 'I', name: 'Ar + He mix',     composition: 'Ar + He' },

  // --- M1: Mildly oxidising ------------------------------------------------
  { id: 4,  code: 'M11', groupCode: 'M', name: 'Ar + CO2 (≤5%)',        composition: 'Ar + 0.5–5% CO2' },
  { id: 5,  code: 'M12', groupCode: 'M', name: 'Ar + O2 (≤3%)',         composition: 'Ar + 0.5–3% O2' },
  { id: 6,  code: 'M13', groupCode: 'M', name: 'Ar + He + H2 (≤3%)',    composition: 'Ar + He + 0.5–3% H2' },
  { id: 7,  code: 'M14', groupCode: 'M', name: 'Ar + He + CO2',         composition: 'Ar + He + 0.5–5% CO2' },

  // --- M2: Oxidising -------------------------------------------------------
  { id: 8,  code: 'M20', groupCode: 'M', name: 'Ar + CO2 (5–25%)',      composition: 'Ar + 5–15% CO2' },
  { id: 9,  code: 'M21', groupCode: 'M', name: 'Ar + CO2 (15–25%)',     composition: 'Ar + 15–25% CO2  (typical MAG)' },
  { id: 10, code: 'M22', groupCode: 'M', name: 'Ar + O2 (3–10%)',       composition: 'Ar + 3–10% O2' },
  { id: 11, code: 'M23', groupCode: 'M', name: 'Ar + CO2 (≤5%) + O2',   composition: 'Ar + ≤5% CO2 + 3–8% O2' },
  { id: 12, code: 'M24', groupCode: 'M', name: 'Ar + CO2 + O2',         composition: 'Ar + 5–15% CO2 + 1–8% O2' },
  { id: 13, code: 'M25', groupCode: 'M', name: 'Ar + CO2 + O2 (high)',  composition: 'Ar + 15–25% CO2 + 1–8% O2' },

  // --- M3: High-oxidising --------------------------------------------------
  { id: 14, code: 'M26', groupCode: 'M', name: 'Ar + CO2 (25–50%)',     composition: 'Ar + 25–50% CO2' },
  { id: 15, code: 'M27', groupCode: 'M', name: 'Ar + CO2 + O2 (high)',  composition: 'Ar + 5–50% CO2 + 8–15% O2' },

  // --- C: CO2-rich ---------------------------------------------------------
  { id: 16, code: 'C1', groupCode: 'C', name: '100% CO2',               composition: '100% CO2' },
  { id: 17, code: 'C2', groupCode: 'C', name: 'CO2 + O2',               composition: 'CO2 + O2' },

  // --- R: Reducing ---------------------------------------------------------
  { id: 18, code: 'R1', groupCode: 'R', name: 'Ar + H2 (≤15%)',         composition: 'Ar + 0.5–15% H2' },
  { id: 19, code: 'R2', groupCode: 'R', name: 'Ar + H2 (>15%)',         composition: 'Ar + >15% H2' },

  // --- N: Low-reactivity / nitrogen ---------------------------------------
  { id: 20, code: 'N1', groupCode: 'N', name: '100% N2',                composition: '100% N2' },
  { id: 21, code: 'N2', groupCode: 'N', name: 'Ar + N2',                composition: 'Ar + 0.5–5% N2' },
  { id: 22, code: 'N3', groupCode: 'N', name: 'Ar + H2 + N2',           composition: 'Ar + H2 + N2' },
  { id: 23, code: 'N4', groupCode: 'N', name: 'N2 + H2',                composition: 'N2 + H2' },
  { id: 24, code: 'N5', groupCode: 'N', name: 'Ar + He + N2',           composition: 'Ar + He + N2' },

  // --- O: Oxygen -----------------------------------------------------------
  { id: 25, code: 'O1', groupCode: 'O', name: '100% O2',                composition: '100% O2' },
];

export async function seedShieldingGases(prisma: PrismaClient): Promise<number> {
  for (const g of shieldingGases) {
    await prisma.refShieldingGas.upsert({ where: { id: g.id }, update: g, create: g });
  }
  return shieldingGases.length;
}
