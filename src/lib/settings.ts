import "server-only";
import { cache } from "react";
import { db } from "@/db";
import { settings } from "@/db/schema";

export const DEFAULT_SETTINGS = {
  churchName: "Beulah Methodist Church",
  shortName: "Beulah Methodist",
  address: "",
  phone: "",
  email: "",
  website: "",
  currency: "GHS",
  timezone: "Africa/Accra",
  locale: "en-GB",
};

export type ChurchSettings = typeof DEFAULT_SETTINGS;
export type SettingKey = keyof ChurchSettings;

export const getSettings = cache(async (): Promise<ChurchSettings> => {
  const rows = await db.select().from(settings);
  const out = { ...DEFAULT_SETTINGS };
  for (const row of rows) {
    if (row.key in out) out[row.key as SettingKey] = row.value;
  }
  return out;
});
