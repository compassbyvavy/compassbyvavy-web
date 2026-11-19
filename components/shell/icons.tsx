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

const ICONS: Record<string, LucideIcon> = {
  Tent,
  "Ferris wheel": FerrisWheel,
  Trees,
  "Paw print": PawPrint,
  Landmark,
  "Graduation cap": GraduationCap,
  Calendar: CalendarDays,
  "Ice cream": IceCreamCone,
  Car,
};

export function CategoryIcon({
  name,
  camps = false,
  size = 28,
}: {
  name: string;
  camps?: boolean;
  size?: number;
}) {
  const Icon = ICONS[name] ?? Trees;
  return (
    <Icon
      aria-hidden="true"
      size={size}
      strokeWidth={1.75}
      color={camps ? "#C9702F" : "#33503E"}
    />
  );
}
