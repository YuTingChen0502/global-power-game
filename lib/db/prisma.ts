import "server-only";

import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as typeof globalThis & {
  globalPowerGamePrisma?: PrismaClient;
};

export const prisma = globalForPrisma.globalPowerGamePrisma ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.globalPowerGamePrisma = prisma;
}
