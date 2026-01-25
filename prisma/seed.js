/* eslint-disable no-console */
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
  // productos demo (no duplica por name unique)
  const products = [
    { name: "Bebida", category: "BEBIDAS", price: 1200, stock: 999, stockCritical: 0, isActive: true },
    { name: "Cigarros", category: "CIGARRILLOS", price: 300, stock: 999, stockCritical: 0, isActive: true },

    { name: "Heineken", category: "CERVEZAS", price: 1800, stock: 999, stockCritical: 0, isActive: true },
    { name: "Cristal", category: "CERVEZAS", price: 1800, stock: 999, stockCritical: 0, isActive: true },
    { name: "Escudo", category: "CERVEZAS", price: 1800, stock: 999, stockCritical: 0, isActive: true },
    { name: "Budweiser", category: "CERVEZAS", price: 1800, stock: 999, stockCritical: 0, isActive: true },

    { name: "Combinado Johnny + bebida", category: "COMBINADOS", price: 3500, stock: 999, stockCritical: 0, isActive: true },
    { name: "Combinado Johnny + energética", category: "COMBINADOS", price: 4500, stock: 999, stockCritical: 0, isActive: true },
    { name: "Combinado Ron + bebida", category: "COMBINADOS", price: 3000, stock: 999, stockCritical: 0, isActive: true },
  ];

  for (const p of products) {
    await prisma.product.upsert({
      where: { name: p.name },
      update: { category: p.category, price: p.price, isActive: true }, // actualiza precio si cambiaste
      create: p,
    });
  }

  console.log("✅ Seed products OK");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
