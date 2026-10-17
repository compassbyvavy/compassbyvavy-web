import { BoardCalendar } from "@/components/calendar/BoardCalendar";
import { loadCampsCatalogForRequest } from "@/lib/camps/campsServerCatalog";
import "./calendar.css";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "School calendar",
  description:
    "Verified 2026–27 PA days and breaks for TDSB, TCDSB, Peel, Halton, York, and Durham.",
};

export default async function SchoolCalendarPage() {
  const catalog = await loadCampsCatalogForRequest();
  return (
    <div className="container">
      <BoardCalendar
        programs={catalog?.programs ?? []}
        providers={catalog?.providers ?? []}
        sessions={catalog?.sessions ?? []}
      />
    </div>
  );
}
