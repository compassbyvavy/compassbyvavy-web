import type { Metadata } from "next";
import { CategoryRow } from "@/components/home/CategoryRow";
import { Hero } from "@/components/home/Hero";
import { LearnRow } from "@/components/home/LearnRow";
import { PlanTeaser } from "@/components/home/PlanTeaser";
import { TrustSection } from "@/components/home/TrustSection";
import { WaitlistBand } from "@/components/home/WaitlistBand";
import { WinterCollections } from "@/components/home/WinterCollections";

export const metadata: Metadata = {
  title: { absolute: "Compass by Vavy" },
  description:
    "Places, events, classes, camps and weekend adventures, matched to your kids, your budget and the time you actually have.",
  openGraph: {
    title: "Compass by Vavy",
    description:
      "Places, events, classes, camps and weekend adventures, matched to your kids, your budget and the time you actually have.",
    images: [
      {
        url: "/brand/mark-on-green.png",
        width: 1080,
        height: 1080,
        alt: "Compass by Vavy",
      },
    ],
  },
};

export default function HomePage() {
  return (
    <div className="home">
      <Hero />
      <CategoryRow />
      <WinterCollections />
      <PlanTeaser />
      <LearnRow />
      <TrustSection />
      <WaitlistBand />
    </div>
  );
}
