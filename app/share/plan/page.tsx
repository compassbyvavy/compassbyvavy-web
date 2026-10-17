import { Suspense } from "react";
import { SharedPlanClient } from "@/components/share/SharedPlanClient";

export const metadata = {
  title: "Shared plan",
  description: "Open a private Camp Buddies link on this device.",
};

export default function SharedPlanPage() {
  return (
    <div className="container" style={{ padding: "28px 0 72px" }}>
      <Suspense fallback={<p>Opening the private plan…</p>}>
        <SharedPlanClient />
      </Suspense>
    </div>
  );
}
