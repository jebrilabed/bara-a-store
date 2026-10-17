import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";

export const { handlers, auth, signIn, signOut } = NextAuth({
  trustHost: true,
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
          select: { id: true, name: true, email: true, password: true, role: true },
        });
        if (!user || !["CUSTOMER", "ADMIN"].includes(user.role)) return null;

        const passwordMatches = await bcrypt.compare(password, user.password).catch(() => false);
        if (!passwordMatches) return null;
        return { id: user.id, name: user.name, email: user.email, role: user.role };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      const jwtToken = token as typeof token & { role?: string; roleCheckedAt?: number };
      const authenticatedUser = user as (typeof user & { role?: string }) | undefined;

      if (authenticatedUser?.role) {
        jwtToken.role = authenticatedUser.role;
        jwtToken.roleCheckedAt = Date.now();
        return jwtToken;
      }

      if (jwtToken.sub && Date.now() - (jwtToken.roleCheckedAt ?? 0) >= 60_000) {
        const currentUser = await db.user.findUnique({
          where: { id: jwtToken.sub },
          select: { role: true },
        });
        if (!currentUser) {
          delete jwtToken.sub;
          delete jwtToken.role;
        } else {
          jwtToken.role = currentUser.role;
        }
          jwtToken.roleCheckedAt = Date.now();
      }

      return jwtToken;
    },
    async session({ session, token }) {
      const jwtToken = token as typeof token & { role?: string };
      if (!jwtToken.sub || !jwtToken.role) {
        return { ...session, user: undefined } as any;
      }

      return {
        ...session,
        user: { ...session.user, id: jwtToken.sub, role: jwtToken.role },
      } as any;
    },
  },
});
