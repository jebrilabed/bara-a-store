import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";

export const { handlers, auth, signIn, signOut } = NextAuth({
  session: { strategy: "jwt", maxAge: 60 * 60 * 8 },
  pages: { signIn: "/ar/login" },
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const email = String(credentials?.email ?? "").trim().toLowerCase();
        const password = String(credentials?.password ?? "");
        if (!email || email.length > 254 || password.length < 1 || password.length > 128) return null;

        const user = await db.user.findFirst({
          where: { email: { equals: email, mode: "insensitive" } },
        });
        if (!user || !["CUSTOMER", "ADMIN"].includes(user.role)) return null;

        const passwordMatches = await bcrypt.compare(password, user.password).catch(() => false);
        if (!passwordMatches) return null;
        return { id: user.id, name: user.name, email: user.email };
      },
    }),
  ],
  callbacks: {
    async session({ session, token }) {
      const user = token.sub
        ? await db.user.findUnique({
            where: { id: token.sub },
            select: { id: true, name: true, email: true, role: true },
          })
        : null;

      if (!user) {
        return { ...session, user: undefined } as any;
      }

      return {
        ...session,
        user: { ...session.user, id: user.id, name: user.name, email: user.email, role: user.role },
      } as any;
    },
  },
});
