const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");

const prisma = new PrismaClient();

async function upsertUser({ username, name, role, password }) {
  const passwordHash = await bcrypt.hash(password, 10);

  await prisma.user.upsert({
    where: { username },
    update: {
      name,
      role,
      isActive: true,
      passwordHash, // ✅ importante: si alguna vez quedó malo, lo repara
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
  // --------------------
  // USERS (LOGIN OK)
  // --------------------
  await upsertUser({
    username: "admin",
    name: "Dueño",
    role: "MASTER",
    password: "admin1234",
  });

  await upsertUser({
    username: "manager",
    name: "Gerente",
    role: "SLAVE",
    password: "manager1234",
  });

  await upsertUser({
    username: "seller1",
    name: "Vendedor 1",
    role: "SELLER",
    password: "seller1234",
  });

  console.log("✅ Seed users OK");

  // --------------------
  // PRODUCTS
  // --------------------
  const products = [
    { name: "Bebida", category: "BEBIDAS", price: 1200, stock: 120, stockCritical: 10, isActive: true },
    { name: "Cigarro", category: "CIGARROS", price: 300, stock: 200, stockCritical: 20, isActive: true },

    { name: "Cerveza Heineken", category: "CERVEZAS", price: 1800, stock: 48, stockCritical: 12, isActive: true },
    { name: "Cerveza Cristal", category: "CERVEZAS", price: 1800, stock: 48, stockCritical: 12, isActive: true },
    { name: "Cerveza Escudo", category: "CERVEZAS", price: 1800, stock: 48, stockCritical: 12, isActive: true },
    { name: "Cerveza Budweiser", category: "CERVEZAS", price: 1800, stock: 48, stockCritical: 12, isActive: true },

    { name: "Johnny + bebida", category: "COMBINADOS", price: 3500, stock: 60, stockCritical: 10, isActive: true },
    { name: "Johnny + energética", category: "COMBINADOS", price: 4500, stock: 60, stockCritical: 10, isActive: true },
    { name: "Ron + bebida", category: "COMBINADOS", price: 3000, stock: 60, stockCritical: 10, isActive: true },
  ];

  for (const p of products) {
    await prisma.product.upsert({
      where: { name: p.name },
      update: {
        category: p.category,
        price: p.price,
        stock: p.stock,
        stockCritical: p.stockCritical,
        isActive: p.isActive,
      },
      create: p,
    });
  }

  console.log("✅ Seed products OK");
}

main()
  .catch((e) => {
    console.error("❌ Seed error", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
