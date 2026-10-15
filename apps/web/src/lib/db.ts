import { PrismaClient } from "@/generated/prisma";
const g = globalThis as any;
export const db: PrismaClient = g.db ?? new PrismaClient();
if (process.env.NODE_ENV !== "production") g.db = db;
