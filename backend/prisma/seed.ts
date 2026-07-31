import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../app/generated/prisma/client";
import bcrypt from "bcryptjs";

const STORE_CONFIG_ID = "singleton";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

async function main() {
  const email = process.env.ADMIN_EMAIL;
  const password = process.env.ADMIN_PASSWORD;

  if (!email || !password) {
    throw new Error("Define ADMIN_EMAIL y ADMIN_PASSWORD en tu .env antes de ejecutar el seed.");
  }
  if (password.length < 8) {
    throw new Error("ADMIN_PASSWORD debe tener al menos 8 caracteres.");
  }

  const passwordHash = await bcrypt.hash(password, 12);

  const admin = await prisma.admin.upsert({
    where: { email },
    update: { passwordHash },
    create: { email, passwordHash },
  });

  await prisma.storeConfig.upsert({
    where: { id: STORE_CONFIG_ID },
    update: {},
    create: {
      id: STORE_CONFIG_ID,
      whatsappNumber: "+573181454142",
      instagramUrl: "https://www.instagram.com/cafe_1583/",
    },
  });

  console.log(`Administrador listo: ${admin.email}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
