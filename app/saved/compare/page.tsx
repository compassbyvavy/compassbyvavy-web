import { Suspense } from "react";
import { CompareClient } from "@/components/shortlist/CompareClient";
import { loadCampsCatalog } from "@/lib/camps/catalog";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Compare camps",
  description:
    "Compare 2–4 camp sessions side by side. Unknown stays unknown; prices are not ranked across different units.",
};

export default function ComparePage() {
  const catalog = loadCampsCatalog();
  return (
    <div className="container camps-listing-page">
      <Suspense fallback={<p className="camp-card-note">Loading comparison…</p>}>
        <CompareClient
          catalog={catalog}
          nowIso="2026-08-28T16:00:00.000Z"
        />
      </Suspense>
    </div>
  );
}
