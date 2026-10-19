import type { IndoorPlayVenue } from "@/data/play/types";
import {
  AGE_GROUP_CHIP_LABELS,
  AGE_RANGE_NOT_RECORDED,
  AREA_CHIP_LABELS,
  VISIT_CHIP_LABELS,
  bookingOnlyLabel,
  deriveAgeGroups,
  derivePriceBand,
  formatHoursCheckedAt,
  formatWeekdayChildPrice,
  formatWeeklyHoursSummary,
} from "@/lib/play/indoorPlayFilter";

export type IndoorPlayCardProps = {
  venue: IndoorPlayVenue;
};

export function IndoorPlayCard({ venue }: IndoorPlayCardProps) {
  const priceLabel = formatWeekdayChildPrice(venue.weekdayChildPrice);
  const priceBand = derivePriceBand(venue);
  const ages = deriveAgeGroups(venue);
  const booking = bookingOnlyLabel(venue.status);
  const hoursSummary = formatWeeklyHoursSummary(venue.weeklyHours);
  const hoursAsOf = venue.weeklyHours
    ? formatHoursCheckedAt(venue.weeklyHours.checkedAt)
    : null;
  const areaLabel = venue.area ? AREA_CHIP_LABELS[venue.area] : null;
  const visitLabel = venue.visitMode
    ? VISIT_CHIP_LABELS[venue.visitMode]
    : null;

  return (
    <article className="play-card" data-venue-code={venue.code}>
      <div className="play-card-body">
        <div className="play-card-top">
          <div className="play-card-identity">
            {areaLabel ? (
              <p className="play-card-kicker">{areaLabel}</p>
            ) : null}
            <h3 className="play-card-title">{venue.name}</h3>
            <p className="play-card-place">{venue.address}</p>
          </div>
          {booking ? (
            <p className="play-card-booking">{booking}</p>
          ) : null}
        </div>

        <p
          className={
            priceBand === "call_for_price"
              ? "play-card-price play-card-price-unknown"
              : "play-card-price"
          }
        >
          {priceLabel}
        </p>

        {ages.length > 0 ? (
          <ul className="play-card-ages">
            {ages.map((age) => (
              <li key={age} className="play-pill">
                {AGE_GROUP_CHIP_LABELS[age]}
              </li>
            ))}
          </ul>
        ) : (
          <p className="play-card-note">{AGE_RANGE_NOT_RECORDED}</p>
        )}

        {hoursSummary && hoursAsOf ? (
          <p className="play-card-hours">
            <span>{hoursSummary}</span>
            <span className="play-card-hours-as-of">{hoursAsOf}</span>
          </p>
        ) : (
          <p className="play-card-note">Hours not recorded</p>
        )}

        {visitLabel ? (
          <p className="play-card-visit">{visitLabel}</p>
        ) : null}
      </div>
    </article>
  );
}
