import { PLAY_VENUES } from "@/data/play/venues";
import type { PlayVenue } from "@/data/play/types";

export function getPlayVenue(slug: string): PlayVenue | undefined {
  return PLAY_VENUES.find((venue) => venue.slug === slug);
}

export function getPublishedPlayVenues(): PlayVenue[] {
  return PLAY_VENUES.filter((venue) => venue.status === "verified");
}
