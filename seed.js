const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");

const prisma = new PrismaClient();

async function main() {
  const pass = "admin1234";
  const hash = await bcrypt.hash(pass, 10);

  await prisma.user.upsert({
    where: { username: "admin" },
    update: {
      passwordHash: hash,
      isActive: true,
      role: "MASTER",
      name: "Dueño"
    },
    create: {
      username: "admin",
      passwordHash: hash,
      isActive: true,
      role: "MASTER",
      name: "Dueño"
    }
  });

  console.log("✅ Seed OK → admin / admin1234");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
