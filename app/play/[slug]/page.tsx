import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PlayVenueDetail } from "@/components/play/PlayVenueDetail";
import { PLAY_VENUES } from "@/data/play/venues";
import { getPlayVenue } from "@/lib/play/catalog";
import "../play.css";

type Props = { params: Promise<{ slug: string }> };

export function generateStaticParams() {
  return PLAY_VENUES.map((venue) => ({ slug: venue.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const venue = getPlayVenue((await params).slug);
  if (!venue) return { title: "Venue not found" };
  return {
    title: `${venue.name} — ages, activities, prices and parent tips`,
    description: `${venue.name} in ${venue.address.city}: verified activities, best ages, prices, offers, practical details and parent review themes.`,
  };
}

export default async function PlayVenuePage({ params }: Props) {
  const venue = getPlayVenue((await params).slug);
  if (!venue || venue.status !== "verified") notFound();
  return <PlayVenueDetail venue={venue} />;
}
