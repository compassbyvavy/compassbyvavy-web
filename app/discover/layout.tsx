import { DiscoverCategoryNav } from "@/components/discover/DiscoverCategoryNav";
import { campsFontVariables } from "@/lib/camps/fonts";
import "../camps/camps.css";
import "./discover.css";

export default function DiscoverLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <div className={`camps-theme ${campsFontVariables}`}>
      <div className="container">
        <DiscoverCategoryNav />
      </div>
      {children}
    </div>
  );
}
