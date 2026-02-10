// prisma/seed.js
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
  // crea 8 mesas POOL + 1 BAR (ejemplo)
  const tables = [
    ...Array.from({ length: 8 }).map((_, i) => ({
      id: i + 1,
      name: `MESA ${i + 1}`,
      type: "POOL",
    })),
    { id: 99, name: "BARRA", type: "BAR" },
  ];

  for (const t of tables) {
    await prisma.table.upsert({
      where: { id: t.id },
      update: { name: t.name, type: t.type },
      create: t,
    });
  }

  console.log("✅ Seed tables listo");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
