import type { Metadata } from "next";
import { CampsChromeNav } from "@/components/camps/CampsChromeNav";
import { DiscoverCategoryNav } from "@/components/discover/DiscoverCategoryNav";
import { campsFontVariables } from "@/lib/camps/fonts";
import "../camps/camps.css";
import "../discover/discover.css";
import "./saved.css";

export const metadata: Metadata = {
  title: "Plan",
  description:
    "One saved list for camps and Discover places, with a side-by-side compare. No account required. Compass does not process provider registration or payment.",
};

export default function SavedLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <div className={`camps-theme ${campsFontVariables}`}>
      <div className="camps-chrome-bar">
        <div className="container">
          <CampsChromeNav />
        </div>
      </div>
      <div className="container">
        <DiscoverCategoryNav />
      </div>
      {children}
    </div>
  );
}
