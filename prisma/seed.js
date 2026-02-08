const { PrismaClient, Role } = require("@prisma/client");
const bcrypt = require("bcryptjs");

const prisma = new PrismaClient();

async function upsertUser({ username, name, role, password }) {
  const passwordHash = await bcrypt.hash(password, 10);
  return prisma.user.upsert({
    where: { username },
    update: { name, role, passwordHash, isActive: true },
    create: { username, name, role, passwordHash, isActive: true },
  });
}

async function main() {
  // MASTER + SLAVE
  await upsertUser({ username: "master", name: "Master", role: Role.MASTER, password: "admin1234" });
  await upsertUser({ username: "manager", name: "Manager", role: Role.SLAVE, password: "admin1234" });

  // 6 SELLERS
  for (let i = 1; i <= 6; i++) {
    await upsertUser({
      username: `seller${i}`,
      name: `Seller ${i}`,
      role: Role.SELLER,
      password: "seller1234",
    });
  }

  console.log("✅ Seed listo: master/manager + 6 sellers");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
