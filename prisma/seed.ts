import { config } from "dotenv";
config({ path: ".env" });
config({ path: ".env.local", override: true });

import { getPostgresPrisma, ensureCatalogSeed } from "../src/lib/db-postgres";

async function main() {
  const prisma = getPostgresPrisma();
  await ensureCatalogSeed(prisma);
  await prisma.$disconnect();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
