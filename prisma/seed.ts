import { PrismaClient, Role, TableType } from "@prisma/client";
import bcrypt from "bcryptjs";

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
    { id: 8, name: "BARRA", type: TableType.BAR },
  ];

  for (const t of tables) {
    await prisma.table.upsert({
      where: { id: t.id },
      update: { name: t.name, type: t.type },
      create: t,
    });
  }

  // 2) Usuarios base (MASTER + SLAVE)
  const users = [
    {
      username: process.env.MASTER_USERNAME || "admin",
      password: process.env.MASTER_PASSWORD || "admin1234",
      name: process.env.MASTER_NAME || "Dueño",
      role: Role.MASTER,
    },
    {
      username: process.env.SLAVE_USERNAME || "manager",
      password: process.env.SLAVE_PASSWORD || "manager1234",
      name: process.env.SLAVE_NAME || "Administrador",
      role: Role.SLAVE,
    },
  ];

  for (const u of users) {
    const passwordHash = await bcrypt.hash(u.password, 10);

    await prisma.user.upsert({
      where: { username: u.username },
      update: {
        name: u.name,
        role: u.role,
        isActive: true,
        passwordHash,
      },
      create: {
        username: u.username,
        name: u.name,
        role: u.role,
        isActive: true,
        passwordHash,
      },
    });

    console.log(`✅ ${u.role}: ${u.username} / ${u.password}`);
  }

  console.log("🔥 Seed COMPLETO");
}

main()
  .catch((e) => {
    console.error("❌ Seed falló:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
