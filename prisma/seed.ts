import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function main() {
  await prisma.product.createMany({
    data: [
      { name: "Bebida", category: "BEBIDAS", price: 1200, stock: 999, isActive: true },
      { name: "Cigarros", category: "CIGARRILLOS", price: 300, stock: 999, isActive: true },

      { name: "Heineken", category: "CERVEZAS", price: 1800, stock: 999, isActive: true },
      { name: "Cristal", category: "CERVEZAS", price: 1800, stock: 999, isActive: true },
      { name: "Escudo", category: "CERVEZAS", price: 1800, stock: 999, isActive: true },
      { name: "Budweiser", category: "CERVEZAS", price: 1800, stock: 999, isActive: true },

      { name: "Combinado Johnny + bebida", category: "COMBINADOS", price: 3500, stock: 999, isActive: true },
      { name: "Combinado Johnny + energética", category: "COMBINADOS", price: 4500, stock: 999, isActive: true },
      { name: "Combinado Ron + bebida", category: "COMBINADOS", price: 3000, stock: 999, isActive: true },
    ],
    skipDuplicates: true,
  });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });


