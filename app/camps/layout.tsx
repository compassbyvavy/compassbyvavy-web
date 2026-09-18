import type { Metadata } from "next";
import { CampsChromeNav } from "@/components/camps/CampsChromeNav";
import { CampsCommandPalette } from "@/components/camps/CampsCommandPalette";
import { CampsOfflineBanner } from "@/components/camps/CampsOfflineBanner";
import { loadCampsCatalogForRequest } from "@/lib/camps/campsServerCatalog";
import { campsFontVariables } from "@/lib/camps/fonts";
import "./camps.css";

export const metadata: Metadata = {
  title: "Mississauga camps",
  description:
    "Browse verified Mississauga camp sessions — age, dates, venue, hours, care, and price on the same session.",
};

export default async function CampsLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const catalog = await loadCampsCatalogForRequest();
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
