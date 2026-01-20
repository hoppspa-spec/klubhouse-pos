const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");

const prisma = new PrismaClient();

async function main() {
  const adminPass = process.env.MASTER_PASSWORD || "admin1234";
  const managerPass = process.env.SLAVE_PASSWORD || "admin1234";

  const adminHash = await bcrypt.hash(adminPass, 10);
  const managerHash = await bcrypt.hash(managerPass, 10);

  await prisma.user.upsert({
    where: { username: "admin" },
    update: { passwordHash: adminHash, isActive: true, role: "MASTER", name: "Dueño" },
    create: { username: "admin", passwordHash: adminHash, isActive: true, role: "MASTER", name: "Dueño" },
  });

  await prisma.user.upsert({
    where: { username: "manager" },
    update: { passwordHash: managerHash, isActive: true, role: "SLAVE", name: "Administrador" },
    create: { username: "manager", passwordHash: managerHash, isActive: true, role: "SLAVE", name: "Administrador" },
  });

  console.log("Seed OK: admin/manager reseteados");
}

main()
  .catch((e) => {
    console.error("Seed FAIL:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

