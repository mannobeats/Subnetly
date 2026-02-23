import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";

const prismaClientSingleton = () => {
  const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
  return new PrismaClient({ adapter });
};

declare global {
  var __prismaClient: undefined | ReturnType<typeof prismaClientSingleton>;
}

const prisma = globalThis.__prismaClient ?? prismaClientSingleton();

export default prisma;

if (process.env.NODE_ENV !== "production") globalThis.__prismaClient = prisma;
