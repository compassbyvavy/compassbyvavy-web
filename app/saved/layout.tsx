import type { Metadata } from "next";
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
  return (
    <div className={`camps-theme ${campsFontVariables}`}>{children}</div>
  );
}
