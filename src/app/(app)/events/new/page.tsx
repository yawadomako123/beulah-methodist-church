import { asc, eq, inArray } from "drizzle-orm";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { PageHeader } from "@/components/ui";
import { db } from "@/db";
import { groups } from "@/db/schema";
import { ledGroupIds } from "@/lib/groups";
import { can } from "@/lib/permissions";
import { requireUser } from "@/lib/session";
import { getSettings } from "@/lib/settings";
import { EventForm } from "../event-form";

export const metadata: Metadata = { title: "New event" };

export default async function NewEventPage({ searchParams }: { searchParams: Promise<{ group?: string }> }) {
  const user = await requireUser();
  const staff = can(user.role, "events:manage");
  const led = staff ? [] : await ledGroupIds(user);
  if (!staff && led.length === 0) redirect("/no-access");

  const [s, groupOptions] = await Promise.all([
    getSettings(),
    db
      .select({ value: groups.id, label: groups.name })
      .from(groups)
      .where(staff ? eq(groups.active, true) : inArray(groups.id, led))
      .orderBy(asc(groups.name)),
  ]);
  const group = Number((await searchParams).group) || undefined;

  return (
    <>
      <PageHeader title="New event" back={{ href: "/events", label: "Events" }} />
      <EventForm groupOptions={groupOptions} defaultGroupId={group} groupRequired={!staff} timezone={s.timezone} />
    </>
  );
}
