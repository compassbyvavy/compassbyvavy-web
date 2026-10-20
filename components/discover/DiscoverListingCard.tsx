import Link from "next/link";
import { SaveControl } from "@/components/shortlist/SaveControl";
import { placeKindLabel } from "@/lib/discover/categoryPages";
import {
  displayCost,
  displayText,
  latestVerifiedLabel,
} from "@/lib/discover/display";
import { getDiscoverCategory } from "@/lib/discover/categories";
import type { DiscoverPlaceListing } from "@/lib/listings/discoverPlace";
import { saveRefForDiscoverListing } from "@/lib/shortlist/refs";

export function DiscoverListingCard({
  listing,
}: {
  listing: DiscoverPlaceListing;
}) {
  const category = getDiscoverCategory(listing.category);
  const kind = placeKindLabel(listing.category, listing.extension.placeKind);
  const verified = latestVerifiedLabel(listing.lastVerifiedOn);

  return (
    <article className="camp-card" data-listing-id={listing.id}>
      <div className="camp-card-body">
        <div className="camp-card-top">
          <div className="camp-card-identity">
            <p className="camp-card-provider">
              {category?.title ?? "Discover"}
              {listing.verification === "example" ? " · Example" : ""}
            </p>
            <h3 className="camp-card-title">
              <Link href={listing.href}>{listing.title}</Link>
            </h3>
            <p className="camp-card-place">{displayText(listing.areaLabel)}</p>
          </div>
          <SaveControl
            refToSave={saveRefForDiscoverListing(listing.id)}
            label={listing.title}
            variant="heart"
          />
        </div>

        <div className="camp-card-pills">
          <span className="camp-pill">{kind}</span>
          {listing.verification === "example" ? (
            <span className="camp-pill camp-pill-amber">Example data</span>
          ) : null}
        </div>

        <p className="camp-card-description">
          {displayText(listing.summary)}
        </p>

        <ul className="camp-card-facts">
          <li>
            <span className="camp-card-fact-label">Cost</span>
            <span>{displayCost(listing)}</span>
          </li>
          <li>
            <span className="camp-card-fact-label">Provider</span>
            <span>{displayText(listing.providerName)}</span>
          </li>
        </ul>

        <div className="camp-card-footer">
          <span className="camp-status-chip camp-status-muted">{verified}</span>
        </div>

        <div className="camp-card-actions">
          <Link className="camp-card-cta" href={listing.href}>
            View details
          </Link>
        </div>
      </div>
    </article>
  );
}
