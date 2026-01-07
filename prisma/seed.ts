import { PrismaClient, Role, TableType } from "@prisma/client";
import * as bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  // 1) Mesas
  const tables = [
    { id: 1, name: "MESA 1", type: TableType.POOL },
    { id: 2, name: "MESA 2", type: TableType.POOL },
    { id: 3, name: "MESA 3", type: TableType.POOL },
    { id: 4, name: "MESA 4", type: TableType.POOL },
    { id: 5, name: "MESA 5", type: TableType.POOL },
    { id: 6, name: "MESA 6", type: TableType.POOL },
    { id: 7, name: "MESA 7", type: TableType.POOL },
    { id: 8, name: "BARRA", type: TableType.BAR }
  ];

  for (const t of tables) {
    await prisma.table.upsert({
      where: { id: t.id },
      update: { name: t.name, type: t.type },
      create: t
    });
  }

  // 2) Usuario MASTER inicial
  // Cambia estos valores cuando quieras
  const username = "admin";
  const password = "admin1234";
  const name = "Dueño";

  const passwordHash = await bcrypt.hash(password, 10);

  await prisma.user.upsert({
    where: { username },
    update: { name, role: Role.MASTER, isActive: true },
    create: {
      username,
      name,
      role: Role.MASTER,
      isActive: true,
      passwordHash
    }
  });

  // 3) Productos base (ejemplo)
  const products = [
    { name: "Combinado (base)", category: "COMBINADOS", price: 3500, stock: 0, stockCritical: 5 },
    { name: "Bebida lata", category: "BEBIDAS", price: 1500, stock: 0, stockCritical: 10 },
    { name: "Agua mineral", category: "AGUA", price: 1200, stock: 0, stockCritical: 10 },
    { name: "Energética", category: "ENERGETICAS", price: 2000, stock: 0, stockCritical: 10 }
  ];

  for (const p of products) {
    await prisma.product.upsert({
      where: { name: p.name }, // OJO: esto requiere que Product.name sea unique (ver abajo opción A o B)
      update: { category: p.category, price: p.price, stockCritical: p.stockCritical, isActive: true },
      create: { ...p, isActive: true }
    });
  }

  console.log("✅ Seed listo:");
  console.log("- Mesas 1..7 POOL, 8 BAR");
  console.log(`- Usuario MASTER: ${username} / ${password}`);
  console.log("- Productos base creados");
}

main()
  .catch((e) => {
    console.error("❌ Seed falló:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
