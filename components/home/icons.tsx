import {
  CalendarDays,
  Car,
  FerrisWheel,
  GraduationCap,
  IceCreamCone,
  Landmark,
  PawPrint,
  Tent,
  Trees,
  type LucideIcon,
} from "lucide-react";
import type { HomeCategoryIcon } from "@/lib/home/home";

const ICONS: Record<HomeCategoryIcon, LucideIcon> = {
  Tent,
  FerrisWheel,
  Trees,
  PawPrint,
  Landmark,
  GraduationCap,
  CalendarDays,
  IceCreamCone,
  Car,
};

/** Line icons. Colour comes from CSS: forest green, Camps in fox orange. */
export function CategoryIcon({ name }: { name: HomeCategoryIcon }) {
  const Icon = ICONS[name];
  return <Icon className="home-cat-icon" aria-hidden="true" size={32} strokeWidth={1.75} />;
}
