import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();

async function main() {
  const email = process.env.ADMIN_BOOTSTRAP_EMAIL?.trim().toLowerCase();
  const password = process.env.ADMIN_BOOTSTRAP_PASSWORD;
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) {
    throw new Error("Set a valid ADMIN_BOOTSTRAP_EMAIL in .env");
  }
  if (!password || password.length < 6 || password.length > 128) {
    throw new Error("Set ADMIN_BOOTSTRAP_PASSWORD to a password of at least 6 characters in .env");
  }

  const hashedPassword = await bcrypt.hash(password, 12);

  const existing = await db.user.findFirst({
    where: { email: { equals: email, mode: "insensitive" } },
  });

  if (existing) {
    await db.user.update({
      where: { id: existing.id },
      data: {
        password: hashedPassword,
        role: "ADMIN",
      },
    });
    console.info(`Admin account (${email}) password and role updated successfully.`);
  } else {
    await db.user.create({
      data: {
        name: "المدير",
        email,
        password: hashedPassword,
        role: "ADMIN",
      },
    });
    console.info(`Admin account (${email}) created successfully.`);
  }
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : "Admin bootstrap failed");
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
