/**
 * Seeds default giving funds. With --demo it also adds sample members, groups,
 * events, attendance and giving so you can explore the system.
 *
 *   npm run db:seed
 *   npm run db:seed -- --demo
 */
import { config } from "dotenv";

config({ path: ".env.local" });
config();

const DEFAULT_FUNDS = [
  ["Tithe", "Tithes (one tenth)"],
  ["Sunday Offering", "General offering at services"],
  ["Thanksgiving", "Thanksgiving offerings"],
  ["Harvest", "Annual harvest thanksgiving"],
  ["Building Fund", "Church building and projects"],
  ["Welfare", "Support for members in need"],
  ["Missions & Evangelism", "Outreach and mission work"],
] as const;

const FIRST = {
  male: ["Kwame", "Kofi", "Yaw", "Kwabena", "Kwaku", "Emmanuel", "Samuel", "Daniel", "Joseph", "Isaac", "Michael", "Richard"],
  female: ["Akua", "Ama", "Abena", "Afua", "Adwoa", "Grace", "Esther", "Mercy", "Joyce", "Comfort", "Elizabeth", "Patience"],
};
const LAST = ["Mensah", "Asante", "Owusu", "Boateng", "Appiah", "Osei", "Addo", "Ansah", "Darko", "Amoah", "Quaye", "Sarpong"];

function pick<T>(arr: readonly T[], i: number) {
  return arr[i % arr.length];
}
function isoDaysAgo(days: number) {
  return new Date(Date.now() - days * 86400000).toISOString().slice(0, 10);
}

async function main() {
  const { db } = await import("../src/db");
  const s = await import("../src/db/schema");
  const demo = process.argv.includes("--demo");

  for (const [name, description] of DEFAULT_FUNDS) {
    await db.insert(s.funds).values({ name, description }).onConflictDoNothing();
  }
  console.log(`✓ ${DEFAULT_FUNDS.length} default funds`);

  if (!demo) return process.exit(0);

  const [{ n }] = await db.select({ n: (await import("drizzle-orm")).count() }).from(s.members);
  if (n > 0) {
    console.log("Members already exist, skipping demo data.");
    return process.exit(0);
  }

  const funds = await db.select().from(s.funds);
  const memberIds: number[] = [];
  for (let h = 0; h < 12; h++) {
    const last = LAST[h];
    const [hh] = await db
      .insert(s.households)
      .values({ name: `The ${last} household`, address: `${10 + h} Mission Road`, city: "Accra", phone: `024${String(1000000 + h * 7919).slice(0, 7)}` })
      .returning();
    const size = 2 + (h % 3);
    for (let i = 0; i < size; i++) {
      const gender = i === 1 ? "female" : i === 0 ? "male" : h % 2 ? "female" : "male";
      const role = i === 0 ? "head" : i === 1 ? "spouse" : "child";
      const age = role === "child" ? 6 + ((h + i) % 14) : 32 + ((h * 3 + i) % 35);
      const dob = new Date(Date.UTC(new Date().getUTCFullYear() - age, (h * 5 + i * 3) % 12, 1 + ((h * 7 + i) % 27)));
      const first = pick(FIRST[gender], h + i * 5);
      const [m] = await db
        .insert(s.members)
        .values({
          householdId: hh.id,
          householdRole: role,
          title: role === "child" ? null : gender === "male" ? "Mr" : "Mrs",
          firstName: first,
          lastName: last,
          gender,
          dateOfBirth: dob.toISOString().slice(0, 10),
          maritalStatus: role === "child" ? "single" : "married",
          phone: role === "child" ? null : `05${String(40000000 + h * 104729 + i * 31).slice(0, 8)}`,
          email: role === "child" ? null : `${first}.${last}${h}${i}@example.com`.toLowerCase(),
          status: h === 11 ? "visitor" : "active",
          membershipType: role === "child" ? (age < 12 ? "junior_member" : "catechumen") : "full_member",
          membershipDate: isoDaysAgo(365 * (1 + (h % 8))),
          baptismDate: role === "child" ? null : isoDaysAgo(365 * (20 + (h % 10))),
          confirmationDate: role === "child" ? null : isoDaysAgo(365 * (15 + (h % 10))),
          marriageDate: role === "child" ? null : isoDaysAgo(365 * (5 + h) + 40),
          occupation: role === "child" ? "Student" : pick(["Teacher", "Nurse", "Trader", "Engineer", "Accountant", "Farmer"], h + i),
        })
        .returning({ id: s.members.id });
      memberIds.push(m.id);
    }
  }
  console.log(`✓ ${memberIds.length} demo members in 12 households`);

  const groupDefs = [
    { name: "Class 1 – Wesley", type: "class_meeting", meetingDay: "Tuesday", meetingTime: "18:30" },
    { name: "Class 2 – Asbury", type: "class_meeting", meetingDay: "Wednesday", meetingTime: "18:30" },
    { name: "Singing Band", type: "choir", meetingDay: "Thursday", meetingTime: "17:00" },
    { name: "Youth Fellowship", type: "youth", meetingDay: "Saturday", meetingTime: "15:00" },
    { name: "Women's Fellowship", type: "fellowship", meetingDay: "Friday", meetingTime: "17:30" },
    { name: "Men's Fellowship", type: "fellowship", meetingDay: "Friday", meetingTime: "17:30" },
    { name: "Sunday School", type: "sunday_school", meetingDay: "Sunday", meetingTime: "08:00" },
  ] as const;
  const groupIds: number[] = [];
  for (const g of groupDefs) {
    const [row] = await db.insert(s.groups).values({ ...g, location: "Church premises" }).returning({ id: s.groups.id });
    groupIds.push(row.id);
  }
  for (let i = 0; i < memberIds.length; i++) {
    await db
      .insert(s.groupMembers)
      .values({ groupId: groupIds[i % 2], memberId: memberIds[i], role: i < 2 ? "leader" : "member" })
      .onConflictDoNothing();
    if (i % 3 === 0) await db.insert(s.groupMembers).values({ groupId: groupIds[2], memberId: memberIds[i] }).onConflictDoNothing();
  }
  console.log(`✓ ${groupIds.length} groups`);

  // Twelve past Sunday services with attendance and offerings.
  const now = new Date();
  const lastSunday = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - now.getUTCDay(), 9, 0));
  for (let w = 0; w < 12; w++) {
    const startsAt = new Date(lastSunday.getTime() - w * 7 * 86400000);
    const present = memberIds.filter((_, i) => (i + w) % 4 !== 0);
    const [ev] = await db
      .insert(s.events)
      .values({
        title: "Sunday Divine Service",
        type: "service",
        startsAt,
        endsAt: new Date(startsAt.getTime() + 2.5 * 3600000),
        location: "Main sanctuary",
        headcount: present.length + 20 + ((w * 7) % 15),
        visitorCount: 2 + (w % 5),
      })
      .returning({ id: s.events.id });
    await db.insert(s.attendance).values(present.map((memberId) => ({ eventId: ev.id, memberId })));
    const date = startsAt.toISOString().slice(0, 10);
    const offering = funds.find((f) => f.name === "Sunday Offering")!;
    const tithe = funds.find((f) => f.name === "Tithe")!;
    await db.insert(s.contributions).values({ fundId: offering.id, amount: (850 + ((w * 137) % 400)).toFixed(2), date, method: "cash", notes: "Loose offering" });
    for (const [i, memberId] of present.slice(0, 10).entries()) {
      await db.insert(s.contributions).values({
        memberId,
        fundId: tithe.id,
        amount: (100 + ((i * 53 + w * 17) % 300)).toFixed(2),
        date,
        method: i % 3 === 0 ? "mobile_money" : "cash",
      });
    }
  }
  const upcoming = new Date(lastSunday.getTime() + 7 * 86400000);
  await db.insert(s.events).values([
    { title: "Sunday Divine Service", type: "service", startsAt: upcoming, location: "Main sanctuary" },
    { title: "Harvest Thanksgiving", type: "special", startsAt: new Date(upcoming.getTime() + 21 * 86400000), location: "Main sanctuary" },
  ]);
  await db.insert(s.pledges).values({
    memberId: memberIds[0],
    fundId: funds.find((f) => f.name === "Building Fund")!.id,
    amount: "5000.00",
    startDate: `${now.getUTCFullYear()}-01-01`,
    endDate: `${now.getUTCFullYear()}-12-31`,
  });
  await db.insert(s.announcements).values({
    title: "Welcome to our new church management system",
    body: "Members can now sign in with Google to see church announcements, upcoming events and their own giving history.",
    pinned: true,
  });
  console.log("✓ services, attendance, giving, pledge and an announcement");
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
