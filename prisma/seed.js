/* prisma/seed.js */
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
  // Productos base
  const products = [
    // Bebidas
    { name: "Bebida", category: "BEBIDAS", price: 1200, stock: 100, isActive: true },

    // Cigarros
    { name: "Cigarro", category: "CIGARROS", price: 300, stock: 200, isActive: true },

    // Cervezas (elige marca en venta, pero el producto es una unidad)
    { name: "Cerveza Heineken", category: "CERVEZAS", price: 1800, stock: 48, isActive: true },
    { name: "Cerveza Cristal", category: "CERVEZAS", price: 1800, stock: 48, isActive: true },
    { name: "Cerveza Escudo", category: "CERVEZAS", price: 1800, stock: 48, isActive: true },
    { name: "Cerveza Budweiser", category: "CERVEZAS", price: 1800, stock: 48, isActive: true },

    // Combinados
    { name: "Johnny + bebida", category: "COMBINADOS", price: 3500, stock: 50, isActive: true },
    { name: "Johnny + energética", category: "COMBINADOS", price: 4500, stock: 50, isActive: true },
    { name: "Ron + bebida", category: "COMBINADOS", price: 3000, stock: 50, isActive: true },
  ];

  // Upsert por name (evita duplicados en cada deploy)
  for (const p of products) {
    await prisma.product.upsert({
      where: { name: p.name },
      update: {
        category: p.category,
        price: p.price,
        stock: p.stock,
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

