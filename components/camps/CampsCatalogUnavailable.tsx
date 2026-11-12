import { getRegistrationAction } from "@/lib/camps/registrationAction";

/**
 * Listing stand-in when production has no published camps, or the read failed.
 * Failure uses the existing load_failed sentence and does not say there are
 * no camps.
 */
export function CampsCatalogUnavailable({ reason }: { reason: "failed" | "empty" }) {
  const lede =
    reason === "failed"
      ? getRegistrationAction({ kind: "load_failed" }).label
      : "We’re still gathering verified Mississauga camp sessions you can compare by age, dates, hours, and cost. Check back soon — or tell us about a camp your family uses.";

  return (
    <div className="camps-listing camps-listing-empty-prod">
      <div className="container">
        <header className="camps-listing-intro">
          <p className="camps-listing-kicker">Mississauga camps</p>
          <h1>Every camp we can verify — not just our favourites</h1>
          <p className="camps-listing-lede">{lede}</p>
        </header>
        <footer className="camps-trust-footer">
          <h2>Coverage &amp; trust</h2>
          <p>
            Know a Mississauga camp we should include?{" "}
            <a href="mailto:hello@compassbyvavy.ca?subject=Camp%20we%20missed">
              Tell us
            </a>
            .
          </p>
        </footer>
      </div>
    </div>
  );
}
