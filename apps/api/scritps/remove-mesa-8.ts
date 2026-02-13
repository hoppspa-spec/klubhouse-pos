import { PrismaClient, TicketStatus } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const mesa = await prisma.table.findFirst({
    where: { name: "MESA 8" },
  });

  if (!mesa) {
    console.log("MESA 8 no existe.");
    return;
  }

  const active = await prisma.ticket.findFirst({
    where: {
      tableId: mesa.id,
      status: { in: [TicketStatus.OPEN, TicketStatus.CHECKOUT] },
    },
  });

  if (active) {
    throw new Error(`MESA 8 tiene ticket activo (${active.id}). Muévelo o ciérralo primero.`);
  }

  await prisma.table.delete({
    where: { id: mesa.id },
  });

  console.log("✅ MESA 8 eliminada correctamente.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
