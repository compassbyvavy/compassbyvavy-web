import Link from "next/link";
import { getPublishedPlayVenues } from "@/lib/play/catalog";
import "./play.css";

export const metadata = {
  title: "Play & Entertainment in Mississauga",
  description: "Verified Mississauga play and entertainment venues with activities, best ages, prices, offers and parent-practical details.",
};

export default function PlayPage() {
  const venues = getPublishedPlayVenues();
  return <div className="play-listing"><header className="play-listing-hero"><div className="play-shell"><p className="play-kicker">Mississauga · Play & Entertainment</p><h1>Know exactly what your family is walking into.</h1><p>Verified activities, honest age guidance, current prices and the practical details parents usually have to hunt for.</p></div></header><section className="play-shell play-listing-section"><div className="play-listing-heading"><div><h2>Verified venues</h2><p>{venues.length} published · more being reviewed</p></div><span>Website-first research</span></div><div className="play-venue-grid">{venues.map((venue) => <Link href={`/play/${venue.slug}`} className="play-venue-card" key={venue.id}><div className="play-venue-art"><span>{venue.id}</span><b>↗</b></div><div className="play-venue-copy"><p className="play-card-category">{venue.primaryCategory}</p><h2>{venue.name}</h2><p>{venue.summary.text}</p><div className="play-card-meta"><span>Ages {venue.compassBestAges}</span><span>{venue.setting}</span><span>{venue.activities.length} activities</span></div></div></Link>)}</div></section></div>;
}
