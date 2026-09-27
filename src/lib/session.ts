import "server-only";
import { eq } from "drizzle-orm";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";
import { db } from "@/db";
import { user as userTable, type Role } from "@/db/schema";
import { auth } from "./auth";
import { can, type Permission } from "./permissions";

export type CurrentUser = {
  id: string;
  name: string;
  email: string;
  image: string | null;
  role: Role;
  active: boolean;
  memberId: number | null;
};

/** The signed-in user, read fresh from the database so role changes apply immediately. */
export const getCurrentUser = cache(async (): Promise<CurrentUser | null> => {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return null;
  const row = await db.query.user.findFirst({ where: eq(userTable.id, session.user.id) });
  if (!row) return null;
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    image: row.image,
    role: row.role,
    active: row.active,
    memberId: row.memberId,
  };
});

/** For pages: signed in and approved, otherwise redirect. */
export async function requireUser(): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) redirect("/sign-in");
  if (!user.active) redirect("/pending");
  return user;
}

/** For pages: redirect to the no-access page when the role lacks the permission. */
export async function requirePermission(permission: Permission): Promise<CurrentUser> {
  const user = await requireUser();
  if (!can(user.role, permission)) redirect("/no-access");
  return user;
}

export class PermissionError extends Error {}

/** For server actions: throws instead of redirecting. */
export async function assertPermission(permission?: Permission): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user || !user.active) throw new PermissionError("You must be signed in.");
  if (permission && !can(user.role, permission)) throw new PermissionError("You do not have permission to do that.");
  return user;
}
