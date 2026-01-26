const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
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
