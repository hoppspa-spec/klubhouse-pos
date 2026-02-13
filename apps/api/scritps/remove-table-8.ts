import { PrismaClient, TicketStatus } from "@prisma/client";
const prisma = new PrismaClient();

async function main() {
  // busca mesa 8 por nombre (ajusta si se llama distinto)
  const t = await prisma.table.findFirst({ where: { name: "MESA 8" } });
  if (!t) {
    console.log("No existe MESA 8");
    return;
  }

  // valida que no tenga ticket abierto
  const open = await prisma.ticket.findFirst({
    where: {
      tableId: t.id,
      status: { in: [TicketStatus.OPEN, TicketStatus.CHECKOUT] },
    },
    select: { id: true, status: true },
  });

  if (open) {
    throw new Error(`MESA 8 tiene ticket activo ${open.id} (${open.status}). Muévelo/cóbralo antes.`);
  }

  await prisma.table.delete({ where: { id: t.id } });
  console.log("✅ MESA 8 eliminada");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
