import { INDOOR_PLAY_CITIES, PLAY_STYLE_FILTERS } from "@/lib/discover/indoorPlaygrounds";
import type {
  AdvertisedIndoorFilters,
  IndoorPlayCard,
  IndoorPlayQuery,
} from "@/lib/discover/indoorPlaygrounds";

function cityHref(city: string, query: IndoorPlayQuery): string {
  const params = new URLSearchParams();
  if (city !== "all") params.set("city", city);
  if (query.age != null) params.set("age", String(query.age));
  if (query.toddler) params.set("toddler", "1");
  for (const style of query.styles) params.append("style", style);
  const text = params.toString();
  return text ? `/discover/play?${text}` : "/discover/play";
}

export function IndoorPlaygroundsBrowse({
  banner,
  preview,
  cards,
  totalListed,
  query,
  filters,
}: {
  banner: string | null;
  preview: boolean;
  cards: IndoorPlayCard[];
  totalListed: number;
  query: IndoorPlayQuery;
  filters: AdvertisedIndoorFilters;
}) {
  const cityName =
    query.city === "all"
      ? "Mississauga, Oakville, and Brampton"
      : INDOOR_PLAY_CITIES.find((city) => city.id === query.city)?.name;
  const filtersActive =
    query.city !== "all" || query.age != null || query.toddler || query.styles.length > 0;
  const narrowed = filtersActive && cards.length !== totalListed;
  const nounCount = narrowed ? totalListed : cards.length;
  const countNoun = preview
    ? nounCount === 1
      ? "preview place"
      : "preview places"
    : nounCount === 1
      ? "verified indoor playground"
      : "verified indoor playgrounds";
  const countText = `${narrowed ? `${cards.length} of ${totalListed}` : cards.length} ${countNoun}${
    query.city !== "all" ? ` in ${cityName}` : ""
  }`;

  return (
    <section className="indoor-play-page">
      <div className="container">
        <span className="eyebrow">Play & Entertainment</span>
        <h1>Indoor playgrounds</h1>
        <p className="hero-lead">
          Soft play, toddler play, adventure play, and multi-level indoor playgrounds
          in {cityName}. Trampoline parks, climbing gyms, arcades, and family
          entertainment centres stay in their own categories.
        </p>
        {banner ? (
          <p className="venue-banner" role="status">
            {banner}
          </p>
        ) : null}

        <div className="indoor-play-cities" role="navigation" aria-label="City">
          <a
            className={query.city === "all" ? "is-selected" : undefined}
            href={cityHref("all", query)}
            aria-current={query.city === "all" ? "page" : undefined}
          >
            All three cities
          </a>
          {INDOOR_PLAY_CITIES.map((city) => (
            <a
              key={city.id}
              className={query.city === city.id ? "is-selected" : undefined}
              href={cityHref(city.id, query)}
              aria-current={query.city === city.id ? "page" : undefined}
            >
              {city.name}
            </a>
          ))}
        </div>

        {filters.age || filters.toddler || filters.styles.length ? (
          <form className="indoor-play-filters" method="get" action="/discover/play">
            {query.city !== "all" ? <input type="hidden" name="city" value={query.city} /> : null}
            {filters.age ? (
              <label className="venue-field">
                Child age
                <input
                  name="age"
                  type="number"
                  inputMode="numeric"
                  min={0}
                  max={17}
                  step={1}
                  defaultValue={query.age ?? ""}
                  placeholder="Any"
                />
              </label>
            ) : null}
            {filters.toddler ? (
              <label className="indoor-play-check">
                <input type="checkbox" name="toddler" value="1" defaultChecked={query.toddler} />
                Toddler-friendly
              </label>
            ) : null}
            {PLAY_STYLE_FILTERS.filter((style) => filters.styles.includes(style.id)).map((style) => (
              <label key={style.id} className="indoor-play-check">
                <input
                  type="checkbox"
                  name="style"
                  value={style.id}
                  defaultChecked={query.styles.includes(style.id)}
                />
                {style.label}
              </label>
            ))}
            <button className="button button-primary" type="submit">
              Apply filters
            </button>
            {filtersActive ? (
              <a className="button button-secondary" href="/discover/play">
                Clear
              </a>
            ) : null}
          </form>
        ) : null}

        {query.ageRejected ? (
          <p className="venue-empty" role="status">
            That age was not applied. Enter a whole number from 0 to 17.
          </p>
        ) : null}

        <p className="indoor-play-count" role="status">
          {countText}
        </p>

        {cards.length ? (
          <ul className="indoor-play-grid">
            {cards.map((card) => (
              <li key={card.id}>
                <article className="content-card indoor-play-card">
                  <p className="eyebrow">
                    {card.cityName}
                    {card.neighbourhood ? ` · ${card.neighbourhood}` : ""}
                  </p>
                  <h2>
                    <a href={card.href}>
                      {card.name}
                      {card.branchName ? ` — ${card.branchName}` : ""}
                    </a>
                  </h2>
                  {card.playStyles.length ? (
                    <ul className="venue-tags" aria-label="Play styles">
                      {card.playStyles.map((style) => (
                        <li key={style}>{style}</li>
                      ))}
                    </ul>
                  ) : null}
                  <dl className="venue-facts">
                    <div>
                      <dt>Compass best fit</dt>
                      <dd>{card.bestFit ?? "Not confirmed"}</dd>
                    </div>
                    {card.officialAges ? (
                      <div>
                        <dt>Official ages</dt>
                        <dd>{card.officialAges}</dd>
                      </div>
                    ) : null}
                    {card.price ? (
                      <div>
                        <dt>Admission</dt>
                        <dd>{card.price}</dd>
                      </div>
                    ) : null}
                  </dl>
                  {card.description ? <p>{card.description}</p> : <p className="venue-empty">Description not confirmed.</p>}
                  <a className="button button-secondary" href={card.href}>
                    Venue details
                  </a>
                </article>
              </li>
            ))}
          </ul>
        ) : (
          <div className="content-card indoor-play-empty">
            <h2>No indoor playgrounds to show</h2>
            <p>
              {totalListed === 0
                ? "Verified indoor playgrounds for these cities are not published yet. A place stays off this list until its operating status, source, and indoor-play type are confirmed."
                : "Nothing in this set matches those filters. Clear a filter to see the other confirmed places."}
            </p>
            <p>
              Know a Mississauga, Oakville, or Brampton indoor playground we should check?{" "}
              <a href="mailto:hello@compassbyvavy.ca?subject=Indoor%20playground%20we%20missed">
                Tell us
              </a>
              .
            </p>
          </div>
        )}
      </div>
    </section>
  );
}
