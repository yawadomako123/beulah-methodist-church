import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";
import { eq, sql } from "drizzle-orm";
import { db } from "@/db";
import * as schema from "@/db/schema";

const adminEmails = (process.env.ADMIN_EMAILS ?? "")
  .split(",")
  .map((e) => e.trim().toLowerCase())
  .filter(Boolean);

// Email/password login exists only so the app can be tried locally without Google
// credentials. It can never be switched on in production.
const devLogin = process.env.NODE_ENV !== "production" && process.env.ALLOW_DEV_LOGIN === "true";

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: "pg",
    schema: { user: schema.user, session: schema.session, account: schema.account, verification: schema.verification },
  }),
  socialProviders: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID ?? "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? "",
      prompt: "select_account",
    },
  },
  emailAndPassword: { enabled: devLogin },
  user: {
    additionalFields: {
      role: { type: "string", defaultValue: "member", input: false },
      active: { type: "boolean", defaultValue: false, input: false },
      memberId: { type: "number", required: false, input: false },
    },
  },
  session: {
    expiresIn: 60 * 60 * 24 * 14,
    updateAge: 60 * 60 * 24,
  },
  databaseHooks: {
    user: {
      create: {
        // New accounts are approved automatically only when they are a listed admin
        // or their email matches a member record; everyone else waits for an admin.
        before: async (newUser) => {
          const email = newUser.email.toLowerCase();
          const isAdmin = adminEmails.includes(email);
          const [match] = await db
            .select({ id: schema.members.id })
            .from(schema.members)
            .where(sql`lower(${schema.members.email}) = ${email}`)
            .limit(1);
          const linked = match
            ? await db.query.user.findFirst({ where: eq(schema.user.memberId, match.id), columns: { id: true } })
            : undefined;
          const memberId = match && !linked ? match.id : null;
          return {
            data: {
              ...newUser,
              email,
              role: isAdmin ? "admin" : "member",
              active: isAdmin || memberId !== null,
              memberId,
            },
          };
        },
      },
    },
  },
  plugins: [nextCookies()],
});
