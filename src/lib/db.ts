import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";

// Prisma 7 exige un driver adapter: ya no trae motor propio de conexion.
function createClient() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("Falta DATABASE_URL. Copia .env.example a .env (docs/01).");
  }
  return new PrismaClient({ adapter: new PrismaPg({ connectionString }) });
}

// En desarrollo, Next recarga los modulos en caliente y crearia un cliente por
// recarga hasta agotar las conexiones. Se guarda uno solo en globalThis.
const globalForPrisma = globalThis as unknown as { prisma?: ReturnType<typeof createClient> };

export const prisma = globalForPrisma.prisma ?? createClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
