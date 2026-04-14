import { PrismaClient } from '@prisma/client';

import { seedWeldingProcesses } from './seeds/ref-welding-processes';
import { seedProductTypes } from './seeds/ref-product-types';
import { seedWeldTypes } from './seeds/ref-weld-types';
import { seedPositions } from './seeds/ref-positions';
import { seedFillerGroups } from './seeds/ref-filler-groups';
import { seedFillerDesignations } from './seeds/ref-filler-designations';
import { seedShieldingGases } from './seeds/ref-shielding-gases';
import { seedMaterialGroups } from './seeds/ref-material-groups';
import { seedWeldDetails } from './seeds/ref-weld-details';
import { seedTestTypes } from './seeds/ref-test-types';
import { seedRuleTables } from './seeds/rule-tables-iso-9606-1-2012';

/**
 * Seed entrypoint.
 *
 *   npm run db:seed
 *
 * Populates:
 *   • ISO 9606-1:2012 reference tables (ref_*)
 *   • ISO 9606-1:2012 rule_sets + rule_tables (Tables 2~7 + product/diameter)
 *
 * Idempotent: safe to re-run after schema changes (each seeder uses upsert).
 */
async function main(): Promise<void> {
  const prisma = new PrismaClient();

  try {
    // eslint-disable-next-line no-console
    console.log('→ seeding ISO 9606-1:2012 reference tables…');

    const counts: Record<string, number> = {};
    counts.ref_welding_processes    = await seedWeldingProcesses(prisma);
    counts.ref_product_types        = await seedProductTypes(prisma);
    counts.ref_weld_types           = await seedWeldTypes(prisma);
    counts.ref_positions            = await seedPositions(prisma);
    counts.ref_filler_groups        = await seedFillerGroups(prisma);
    counts.ref_filler_designations  = await seedFillerDesignations(prisma);
    counts.ref_shielding_gases      = await seedShieldingGases(prisma);
    counts.ref_material_groups      = await seedMaterialGroups(prisma);
    counts.ref_weld_details         = await seedWeldDetails(prisma);
    counts.ref_test_types           = await seedTestTypes(prisma);

    // eslint-disable-next-line no-console
    console.log('→ seeding ISO 9606-1:2012 rule_sets / rule_tables…');
    const ruleResult = await seedRuleTables(prisma);

    // eslint-disable-next-line no-console
    console.log('\n✔ seed complete.');
    // eslint-disable-next-line no-console
    console.table({
      ...counts,
      rule_sets: 1,
      rule_tables: ruleResult.tablesInserted,
    });
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error('✖ seed failed:', err);
  process.exit(1);
});
