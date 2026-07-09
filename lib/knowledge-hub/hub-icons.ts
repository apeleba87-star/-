import {
  Building2,
  Dumbbell,
  Droplets,
  Factory,
  GraduationCap,
  Home,
  Layers,
  Shield,
  Stethoscope,
  Store,
  Sun,
  AppWindow,
  type LucideIcon,
} from "lucide-react";
import type { HubIcon } from "@/lib/knowledge-hub/catalog";

export const HUB_ICON_MAP: Record<HubIcon, LucideIcon> = {
  office: Building2,
  shop: Store,
  stairs: Layers,
  home: Home,
  droplet: Droplets,
  factory: Factory,
  gym: Dumbbell,
  hospital: Stethoscope,
  school: GraduationCap,
  building: Building2,
  apartment: Building2,
  disinfection: Shield,
  exterior: Sun,
  window: AppWindow,
};

export function hubIcon(icon: HubIcon): LucideIcon {
  return HUB_ICON_MAP[icon] ?? Building2;
}
