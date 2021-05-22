import { PrismaClient } from "@prisma/client";
const prismaClient = new PrismaClient({
  // log: ["query", "info", "warn"]
  log: ["info", "warn"],
});

export const prisma = prismaClient;
