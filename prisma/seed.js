/* eslint-disable no-console */
const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");

const prisma = new PrismaClient();

async function upsertUser({ username, name, role, password }) {
  const passwordHash = await bcrypt.hash(password, 10);

  return prisma.user.upsert({
    where: { username },
    update: {
      name,
      role,
      isActive: true,
      passwordHash,
    },
    create: {
      username,
      name,
      role,
      isActive: true,
      passwordHash,
    },
  });
}

async function main() {
  // ✅ Define credenciales iniciales
  // Recomendación: después cambia estas claves (pero para el torneo quedan filete).
  const users = [
    { username: "admin", name: "Dueño", role: "MASTER", password: "Admin#9021!" },
    { username: "manager", name: "Manager", role: "SLAVE", password: "Manager#4827!" },

    { username: "seller1", name: "Seller 1", role: "SELLER", password: "Seller1#1359!" },
    { username: "seller2", name: "Seller 2", role: "SELLER", password: "Seller2#2468!" },
    { username: "seller3", name: "Seller 3", role: "SELLER", password: "Seller3#9753!" },
    { username: "seller4", name: "Seller 4", role: "SELLER", password: "Seller4#8642!" },
    { username: "seller5", name: "Seller 5", role: "SELLER", password: "Seller5#1127!" },
    { username: "seller6", name: "Seller 6", role: "SELLER", password: "Seller6#7751!" },
  ];

  for (const u of users) {
    await upsertUser(u);
  }

  console.log("✅ Seed users OK:");
  users.forEach((u) => console.log(`- ${u.role} | ${u.username} | ${u.password}`));
}

main()
  .catch((e) => {
    console.error("❌ Seed error", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
