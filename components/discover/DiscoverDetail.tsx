import Link from "next/link";
import { SaveControl } from "@/components/shortlist/SaveControl";
import { getCategoryPage } from "@/lib/discover/categoryPages";
import { getDiscoverCategory } from "@/lib/discover/categories";
import {
  displayProviderHref,
  latestVerifiedLabel,
  listingFactRows,
} from "@/lib/discover/display";
import type { DiscoverPlaceListing } from "@/lib/listings/discoverPlace";
import { saveRefForDiscoverListing } from "@/lib/shortlist/refs";

export function DiscoverDetail({ listing }: { listing: DiscoverPlaceListing }) {
  const category = getDiscoverCategory(listing.category);
  const page = getCategoryPage(listing.category);
  const providerHref = displayProviderHref(listing.providerUrl);
  const facts = listingFactRows(listing);

  return (
    <article className="discover-detail" data-listing-id={listing.id}>
      <p className="camps-listing-kicker">
        <Link href={category?.href ?? "/#discover"}>
          {category?.title ?? "Discover"}
        </Link>
      </p>
      <header className="camps-listing-intro">
        <h1>{listing.title}</h1>
        <p className="camp-card-place">{facts.find((row) => row.label === "City")?.value}</p>
        <p className="camp-status-chip camp-status-muted">
          {latestVerifiedLabel(listing.lastVerifiedOn)}
        </p>
      </header>

      {listing.verification === "example" && listing.exampleNote ? (
        <div className="discover-banner" role="note">
          {listing.exampleNote}
        </div>
      ) : null}
      {page?.governanceNote ? (
        <div className="discover-banner discover-banner-services" role="note">
          {page.governanceNote}
        </div>
      ) : null}

      <div className="discover-detail-actions">
        <SaveControl
          refToSave={saveRefForDiscoverListing(listing.id)}
          label={listing.title}
          variant="button"
        />
      </div>

      <dl className="discover-facts">
        {facts.map((row) => (
          <div key={row.label} className="discover-fact">
            <dt>{row.label}</dt>
            <dd>{row.value}</dd>
          </div>
        ))}
      </dl>

      <section className="discover-provider" aria-labelledby="provider-next-step">
        <h2 id="provider-next-step">Next step</h2>
        <p>
          Compass does not take payment or registration. Booking, tickets, and
          sign-up happen with the provider.
        </p>
        {providerHref ? (
          <a
            className="camp-card-cta"
            href={providerHref}
            target="_blank"
            rel="noopener noreferrer"
          >
            Continue on the provider site
          </a>
        ) : (
          <p className="camp-card-note">Provider link: Unknown</p>
        )}
      </section>
    </article>
  );
}
