/**
 * Keeps a date or time range on one line ("Dec 28\u201330", "9:00\u20131:30") so a
 * narrow box breaks between ranges, never inside one ("Dec 28\u2013" / "30").
 */
const RANGE = /([A-Z][a-z]{2} \d{1,2}\u2013\d{1,2}|\d{1,2}:\d{2}\u2013\d{1,2}:\d{2}|\S+\u2013\S+)/g;

export function keepRangesTogether(text: string) {
  return text.split(RANGE).map((part, i) =>
    i % 2 === 1 ? (
      <span key={i} className="camp-nowrap">
        {part}
      </span>
    ) : (
      part
    ),
  );
}
