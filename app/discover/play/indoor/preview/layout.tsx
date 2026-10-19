import type { Metadata } from "next";
import { campsFontVariables } from "@/lib/camps/fonts";
import "../../../../play/play.css";

export const metadata: Metadata = {
  title: "Indoor play preview (dev only)",
  robots: { index: false, follow: false },
};

export default function IndoorPlayPreviewLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return <div className={`play-theme ${campsFontVariables}`}>{children}</div>;
}
