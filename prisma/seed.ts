import { PrismaClient, Role } from "@prisma/client";
// eslint-disable-next-line @typescript-eslint/no-var-requires
const bcrypt = require("bcryptjs");

const prisma = new PrismaClient();

// ✅ CONTRASEÑAS (guárdalas, no se vuelven a mostrar en DB)
const SELLERS = [
  { username: "seller1", name: "Seller 1", password: "S1!Qp7#vN2@k" },
  { username: "seller2", name: "Seller 2", password: "S2!Lm4$zR8@t" },
  { username: "seller3", name: "Seller 3", password: "S3!Xc9%hA5@p" },
  { username: "seller4", name: "Seller 4", password: "S4!Bn6&yK1@w" },
  { username: "seller5", name: "Seller 5", password: "S5!Dd2*eM9@q" },
  { username: "seller6", name: "Seller 6", password: "S6!Jf8^uT3@x" },
];

async function main() {
  for (const s of SELLERS) {
    const hash = await bcrypt.hash(s.password, 10);

    await prisma.user.upsert({
      where: { username: s.username },
      create: {
        username: s.username,
        name: s.name,
        role: Role.SELLER,
        // ⬇️ CAMBIA ESTA LINEA si tu campo se llama distinto
        passwordHash: hash,
      },
      update: {
        name: s.name,
        role: Role.SELLER,
        // ⬇️ CAMBIA ESTA LINEA si tu campo se llama distinto
        passwordHash: hash,
      },
    });
  }

  console.log("✅ Sellers creados/actualizados:");
  for (const s of SELLERS) {
    console.log(`- ${s.username} / ${s.password}`);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });