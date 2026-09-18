import type { Metadata } from "next";
import { CampsChromeNav } from "@/components/camps/CampsChromeNav";
import { CampsCommandPalette } from "@/components/camps/CampsCommandPalette";
import { CampsOfflineBanner } from "@/components/camps/CampsOfflineBanner";
import { loadCampsCatalog } from "@/lib/camps/catalog";
import { campsFontVariables } from "@/lib/camps/fonts";
import "../camps/camps.css";
import "./saved.css";

export const metadata: Metadata = {
  title: "Saved camps",
  description:
    "Your device-local shortlist of camp sessions. No account required. Compass does not process provider registration.",
};

export default function SavedLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const catalog = loadCampsCatalog();
  return (
    <div className={`camps-theme ${campsFontVariables}`}>
      <CampsOfflineBanner />
      <CampsCommandPalette
        programs={catalog?.programs ?? []}
        providers={catalog?.providers ?? []}
      />
      <div className="camps-chrome-bar">
        <div className="container">
          <CampsChromeNav />
        </div>
      </div>
      {children}
    </div>
  );
}
