import bcrypt from "bcryptjs";
import { PrismaClient } from "../apps/web/src/generated/prisma";

const db = new PrismaClient();

async function main() {
  const email = process.env.ADMIN_BOOTSTRAP_EMAIL?.trim().toLowerCase();
  const password = process.env.ADMIN_BOOTSTRAP_PASSWORD;
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) {
    throw new Error("Set a valid ADMIN_BOOTSTRAP_EMAIL for this one-time process.");
  }
  if (!password || password.length < 12 || password.length > 128) {
    throw new Error("Set ADMIN_BOOTSTRAP_PASSWORD to a unique password of 12 to 128 characters.");
  }
  const existingAdmin = await db.user.findFirst({ where: { role: "ADMIN" }, select: { id: true } });
  if (existingAdmin) throw new Error("An admin account already exists; bootstrap is one time only.");
  const existingEmail = await db.user.findFirst({ where: { email: { equals: email, mode: "insensitive" } }, select: { id: true } });
  if (existingEmail) throw new Error("That email already belongs to an account; no role was changed.");

  await db.user.create({
    data: { name: "Store administrator", email, password: await bcrypt.hash(password, 12), role: "ADMIN" },
  });
  console.info("The initial administrator was created.");
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : "Admin bootstrap failed");
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
