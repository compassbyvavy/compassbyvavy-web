/**
 * Every real venue record in the repo, in PE order. The seed script writes a
 * draft seed and a publish script for each; development and Cloudflare
 * preview builds show them as they would look once published.
 */

import type { VenueRecord } from "@/data/discover/venueTypes";
import { pe001AmazingFunPark } from "@/data/discover/venues/pe001AmazingFunPark";
import { pe002BooglesPlayhouse } from "@/data/discover/venues/pe002BooglesPlayhouse";
import { pe003ChuckECheeseArgentia } from "@/data/discover/venues/pe003ChuckECheeseArgentia";
import { pe004ChuckECheeseDixie } from "@/data/discover/venues/pe004ChuckECheeseDixie";
import { pe008Kidsapia } from "@/data/discover/venues/pe008Kidsapia";
import { pe009Kidsports } from "@/data/discover/venues/pe009Kidsports";
import { pe012Playcious } from "@/data/discover/venues/pe012Playcious";
import { pe033SkyZoneMississauga } from "@/data/discover/venues/pe033SkyZoneMississauga";

export const REAL_VENUE_RECORDS: readonly VenueRecord[] = [
  pe001AmazingFunPark,
  pe002BooglesPlayhouse,
  pe003ChuckECheeseArgentia,
  pe004ChuckECheeseDixie,
  pe008Kidsapia,
  pe009Kidsports,
  pe012Playcious,
  pe033SkyZoneMississauga,
];
