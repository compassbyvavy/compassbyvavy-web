import type { Metadata } from "next";
import { CampsChromeNav } from "@/components/camps/CampsChromeNav";
import { campsFontVariables } from "@/lib/camps/fonts";
import "../camps/camps.css";
import "./saved.css";

export const metadata: Metadata = {
  title: "Plan",
  description:
    "One saved list and a side-by-side compare. No account required. Compass does not process provider registration.",
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
      {children}
    </div>
  );
}
