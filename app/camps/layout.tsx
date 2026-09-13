import type { Metadata } from "next";
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
  return (
    <div className={`camps-theme ${campsFontVariables}`}>{children}</div>
  );
}
