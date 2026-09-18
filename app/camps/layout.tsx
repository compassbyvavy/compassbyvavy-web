import type { Metadata } from "next";
import { CampsChromeNav } from "@/components/camps/CampsChromeNav";
import { CampsCommandPalette } from "@/components/camps/CampsCommandPalette";
import { CampsOfflineBanner } from "@/components/camps/CampsOfflineBanner";
import { loadCampsCatalog } from "@/lib/camps/catalog";
import { campsFontVariables } from "@/lib/camps/fonts";
import "./camps.css";

export const metadata: Metadata = {
  title: "Mississauga camps",
  description:
    "Browse verified Mississauga camp sessions — age, dates, venue, hours, care, and price on the same session.",
};

export default function CampsLayout({
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
