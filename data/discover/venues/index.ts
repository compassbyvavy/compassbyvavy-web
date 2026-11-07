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
import { pe005Funday } from "@/data/discover/venues/pe005Funday";
import { pe006JumbalooArgentia } from "@/data/discover/venues/pe006JumbalooArgentia";
import { pe007JumbalooRidgeway } from "@/data/discover/venues/pe007JumbalooRidgeway";
import { pe008Kidsapia } from "@/data/discover/venues/pe008Kidsapia";
import { pe009Kidsports } from "@/data/discover/venues/pe009Kidsports";
import { pe010KidzAtPlay } from "@/data/discover/venues/pe010KidzAtPlay";
import { pe011MightyJungle } from "@/data/discover/venues/pe011MightyJungle";
import { pe012Playcious } from "@/data/discover/venues/pe012Playcious";
import { pe014HappyKingdomDundas } from "@/data/discover/venues/pe014HappyKingdomDundas";
import { pe017JusPlay } from "@/data/discover/venues/pe017JusPlay";
import { pe018Dinoville } from "@/data/discover/venues/pe018Dinoville";
import { pe033SkyZoneMississauga } from "@/data/discover/venues/pe033SkyZoneMississauga";

export const REAL_VENUE_RECORDS: readonly VenueRecord[] = [
  pe001AmazingFunPark,
  pe002BooglesPlayhouse,
  pe003ChuckECheeseArgentia,
  pe004ChuckECheeseDixie,
  pe005Funday,
  pe006JumbalooArgentia,
  pe007JumbalooRidgeway,
  pe008Kidsapia,
  pe009Kidsports,
  pe010KidzAtPlay,
  pe011MightyJungle,
  pe012Playcious,
  pe014HappyKingdomDundas,
  pe017JusPlay,
  pe018Dinoville,
  pe033SkyZoneMississauga,
];
