import { relations, sql } from "drizzle-orm";
import {
  boolean,
  date,
  index,
  integer,
  jsonb,
  numeric,
  pgEnum,
  pgTable,
  primaryKey,
  serial,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";

/* ------------------------------------------------------------------ */
/* Enums                                                               */
/* ------------------------------------------------------------------ */

export const ROLES = ["admin", "pastor", "secretary", "treasurer", "leader", "member"] as const;
export type Role = (typeof ROLES)[number];
export const roleEnum = pgEnum("role", ROLES);

export const MEMBER_STATUSES = ["active", "inactive", "visitor", "transferred", "deceased"] as const;
export const memberStatusEnum = pgEnum("member_status", MEMBER_STATUSES);

export const MEMBERSHIP_TYPES = ["full_member", "catechumen", "junior_member", "adherent", "visitor"] as const;
export const membershipTypeEnum = pgEnum("membership_type", MEMBERSHIP_TYPES);

export const GENDERS = ["male", "female"] as const;
export const genderEnum = pgEnum("gender", GENDERS);

export const MARITAL_STATUSES = ["single", "married", "widowed", "divorced", "separated"] as const;
export const maritalStatusEnum = pgEnum("marital_status", MARITAL_STATUSES);

export const HOUSEHOLD_ROLES = ["head", "spouse", "child", "relative", "other"] as const;
export const householdRoleEnum = pgEnum("household_role", HOUSEHOLD_ROLES);

export const GROUP_TYPES = [
  "class_meeting",
  "fellowship",
  "choir",
  "sunday_school",
  "youth",
  "committee",
  "ministry",
  "other",
] as const;
export const groupTypeEnum = pgEnum("group_type", GROUP_TYPES);

export const GROUP_ROLES = ["leader", "assistant", "member"] as const;
export const groupRoleEnum = pgEnum("group_role", GROUP_ROLES);

export const EVENT_TYPES = ["service", "meeting", "rehearsal", "special", "outreach", "funeral", "wedding", "other"] as const;
export const eventTypeEnum = pgEnum("event_type", EVENT_TYPES);

export const PAYMENT_METHODS = ["cash", "mobile_money", "bank_transfer", "cheque", "card", "other"] as const;
export const paymentMethodEnum = pgEnum("payment_method", PAYMENT_METHODS);

export const AUDIENCES = ["everyone", "leaders", "staff"] as const;
export const audienceEnum = pgEnum("audience", AUDIENCES);

/* ------------------------------------------------------------------ */
/* Better Auth tables                                                  */
/* ------------------------------------------------------------------ */

export const user = pgTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("email_verified").notNull().default(false),
  image: text("image"),
  role: roleEnum("role").notNull().default("member"),
  active: boolean("active").notNull().default(true),
  memberId: integer("member_id").references(() => members.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const session = pgTable(
  "session",
  {
    id: text("id").primaryKey(),
    expiresAt: timestamp("expires_at").notNull(),
    token: text("token").notNull().unique(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
  },
  (t) => [index("session_user_idx").on(t.userId)],
);

export const account = pgTable(
  "account",
  {
    id: text("id").primaryKey(),
    accountId: text("account_id").notNull(),
    providerId: text("provider_id").notNull(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    accessToken: text("access_token"),
    refreshToken: text("refresh_token"),
    idToken: text("id_token"),
    accessTokenExpiresAt: timestamp("access_token_expires_at"),
    refreshTokenExpiresAt: timestamp("refresh_token_expires_at"),
    scope: text("scope"),
    password: text("password"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (t) => [index("account_user_idx").on(t.userId)],
);

export const verification = pgTable(
  "verification",
  {
    id: text("id").primaryKey(),
    identifier: text("identifier").notNull(),
    value: text("value").notNull(),
    expiresAt: timestamp("expires_at").notNull(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (t) => [index("verification_identifier_idx").on(t.identifier)],
);

/* ------------------------------------------------------------------ */
/* Membership                                                          */
/* ------------------------------------------------------------------ */

export const households = pgTable("households", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  address: text("address"),
  city: text("city"),
  phone: text("phone"),
  email: text("email"),
  notes: text("notes"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const members = pgTable(
  "members",
  {
    id: serial("id").primaryKey(),
    householdId: integer("household_id").references(() => households.id, { onDelete: "set null" }),
    householdRole: householdRoleEnum("household_role"),
    title: text("title"),
    firstName: text("first_name").notNull(),
    lastName: text("last_name").notNull(),
    otherNames: text("other_names"),
    gender: genderEnum("gender"),
    dateOfBirth: date("date_of_birth"),
    maritalStatus: maritalStatusEnum("marital_status"),
    phone: text("phone"),
    altPhone: text("alt_phone"),
    email: text("email"),
    address: text("address"),
    hometown: text("hometown"),
    occupation: text("occupation"),
    status: memberStatusEnum("status").notNull().default("active"),
    membershipType: membershipTypeEnum("membership_type").notNull().default("full_member"),
    membershipDate: date("membership_date"),
    baptismDate: date("baptism_date"),
    confirmationDate: date("confirmation_date"),
    marriageDate: date("marriage_date"),
    emergencyContact: text("emergency_contact"),
    photoUrl: text("photo_url"),
    notes: text("notes"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (t) => [
    index("members_name_idx").on(t.lastName, t.firstName),
    index("members_household_idx").on(t.householdId),
    index("members_status_idx").on(t.status),
  ],
);

/* ------------------------------------------------------------------ */
/* Groups, events & attendance                                         */
/* ------------------------------------------------------------------ */

export const groups = pgTable("groups", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  type: groupTypeEnum("type").notNull().default("other"),
  description: text("description"),
  meetingDay: text("meeting_day"),
  meetingTime: text("meeting_time"),
  location: text("location"),
  active: boolean("active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const groupMembers = pgTable(
  "group_members",
  {
    groupId: integer("group_id")
      .notNull()
      .references(() => groups.id, { onDelete: "cascade" }),
    memberId: integer("member_id")
      .notNull()
      .references(() => members.id, { onDelete: "cascade" }),
    role: groupRoleEnum("role").notNull().default("member"),
    joinedAt: date("joined_at").notNull().default(sql`CURRENT_DATE`),
  },
  (t) => [primaryKey({ columns: [t.groupId, t.memberId] }), index("group_members_member_idx").on(t.memberId)],
);

export const events = pgTable(
  "events",
  {
    id: serial("id").primaryKey(),
    title: text("title").notNull(),
    type: eventTypeEnum("type").notNull().default("service"),
    description: text("description"),
    location: text("location"),
    startsAt: timestamp("starts_at", { withTimezone: true }).notNull(),
    endsAt: timestamp("ends_at", { withTimezone: true }),
    groupId: integer("group_id").references(() => groups.id, { onDelete: "set null" }),
    headcount: integer("headcount"),
    visitorCount: integer("visitor_count"),
    createdBy: text("created_by").references(() => user.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [index("events_starts_idx").on(t.startsAt)],
);

export const attendance = pgTable(
  "attendance",
  {
    eventId: integer("event_id")
      .notNull()
      .references(() => events.id, { onDelete: "cascade" }),
    memberId: integer("member_id")
      .notNull()
      .references(() => members.id, { onDelete: "cascade" }),
    recordedBy: text("recorded_by").references(() => user.id, { onDelete: "set null" }),
    recordedAt: timestamp("recorded_at").notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.eventId, t.memberId] }), index("attendance_member_idx").on(t.memberId)],
);

/* ------------------------------------------------------------------ */
/* Giving                                                              */
/* ------------------------------------------------------------------ */

export const funds = pgTable(
  "funds",
  {
    id: serial("id").primaryKey(),
    name: text("name").notNull(),
    description: text("description"),
    active: boolean("active").notNull().default(true),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [uniqueIndex("funds_name_idx").on(t.name)],
);

export const contributions = pgTable(
  "contributions",
  {
    id: serial("id").primaryKey(),
    memberId: integer("member_id").references(() => members.id, { onDelete: "set null" }),
    fundId: integer("fund_id")
      .notNull()
      .references(() => funds.id, { onDelete: "restrict" }),
    amount: numeric("amount", { precision: 12, scale: 2 }).notNull(),
    date: date("date").notNull(),
    method: paymentMethodEnum("method").notNull().default("cash"),
    reference: text("reference"),
    notes: text("notes"),
    recordedBy: text("recorded_by").references(() => user.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [
    index("contributions_date_idx").on(t.date),
    index("contributions_member_idx").on(t.memberId),
    index("contributions_fund_idx").on(t.fundId),
  ],
);

export const pledges = pgTable("pledges", {
  id: serial("id").primaryKey(),
  memberId: integer("member_id")
    .notNull()
    .references(() => members.id, { onDelete: "cascade" }),
  fundId: integer("fund_id")
    .notNull()
    .references(() => funds.id, { onDelete: "restrict" }),
  amount: numeric("amount", { precision: 12, scale: 2 }).notNull(),
  startDate: date("start_date").notNull(),
  endDate: date("end_date").notNull(),
  notes: text("notes"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

/* ------------------------------------------------------------------ */
/* Communication, settings & audit                                     */
/* ------------------------------------------------------------------ */

export const announcements = pgTable("announcements", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  body: text("body").notNull(),
  audience: audienceEnum("audience").notNull().default("everyone"),
  pinned: boolean("pinned").notNull().default(false),
  expiresAt: date("expires_at"),
  createdBy: text("created_by").references(() => user.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const messages = pgTable("messages", {
  id: serial("id").primaryKey(),
  subject: text("subject").notNull(),
  body: text("body").notNull(),
  audienceLabel: text("audience_label").notNull(),
  recipientCount: integer("recipient_count").notNull(),
  sentCount: integer("sent_count").notNull().default(0),
  status: text("status").notNull(),
  sentBy: text("sent_by").references(() => user.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const settings = pgTable("settings", {
  key: text("key").primaryKey(),
  value: text("value").notNull(),
});

export const auditLog = pgTable(
  "audit_log",
  {
    id: serial("id").primaryKey(),
    userId: text("user_id").references(() => user.id, { onDelete: "set null" }),
    action: text("action").notNull(),
    entity: text("entity").notNull(),
    entityId: text("entity_id"),
    details: jsonb("details"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [index("audit_created_idx").on(t.createdAt)],
);

/* ------------------------------------------------------------------ */
/* Relations                                                           */
/* ------------------------------------------------------------------ */

export const userRelations = relations(user, ({ one }) => ({
  member: one(members, { fields: [user.memberId], references: [members.id] }),
}));

export const householdRelations = relations(households, ({ many }) => ({
  members: many(members),
}));

export const memberRelations = relations(members, ({ one, many }) => ({
  household: one(households, { fields: [members.householdId], references: [households.id] }),
  groups: many(groupMembers),
  contributions: many(contributions),
  pledges: many(pledges),
  attendance: many(attendance),
}));

export const groupRelations = relations(groups, ({ many }) => ({
  members: many(groupMembers),
  events: many(events),
}));

export const groupMemberRelations = relations(groupMembers, ({ one }) => ({
  group: one(groups, { fields: [groupMembers.groupId], references: [groups.id] }),
  member: one(members, { fields: [groupMembers.memberId], references: [members.id] }),
}));

export const eventRelations = relations(events, ({ one, many }) => ({
  group: one(groups, { fields: [events.groupId], references: [groups.id] }),
  attendance: many(attendance),
}));

export const attendanceRelations = relations(attendance, ({ one }) => ({
  event: one(events, { fields: [attendance.eventId], references: [events.id] }),
  member: one(members, { fields: [attendance.memberId], references: [members.id] }),
}));

export const fundRelations = relations(funds, ({ many }) => ({
  contributions: many(contributions),
  pledges: many(pledges),
}));

export const contributionRelations = relations(contributions, ({ one }) => ({
  member: one(members, { fields: [contributions.memberId], references: [members.id] }),
  fund: one(funds, { fields: [contributions.fundId], references: [funds.id] }),
}));

export const pledgeRelations = relations(pledges, ({ one }) => ({
  member: one(members, { fields: [pledges.memberId], references: [members.id] }),
  fund: one(funds, { fields: [pledges.fundId], references: [funds.id] }),
}));
