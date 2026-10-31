"use client";

import {
  CalendarDays,
  Package,
  UserRound,
  Users,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { ROUTES } from "@/lib/routes";

import { useMe } from "../hooks/use-me";
import { NAVIGATION_TEXTS } from "./texts";

type Section = {
  href: string;
  paths: string[];
  label: string;
  icon: LucideIcon;
  hiddenForCrew?: boolean;
};

const SECTIONS: Section[] = [
  {
    href: ROUTES.items,
    paths: [ROUTES.items],
    label: NAVIGATION_TEXTS.items,
    icon: Package,
  },
  {
    href: ROUTES.customers,
    paths: [ROUTES.customers],
    label: NAVIGATION_TEXTS.customers,
    icon: Users,
    hiddenForCrew: true,
  },
  {
    href: ROUTES.bookings,
    paths: [ROUTES.bookings, ROUTES.availability],
    label: NAVIGATION_TEXTS.bookings,
    icon: CalendarDays,
  },
  {
    href: ROUTES.account,
    paths: [ROUTES.account],
    label: NAVIGATION_TEXTS.account,
    icon: UserRound,
  },
];

function isCurrent(pathname: string, paths: string[]): boolean {
  return paths.some(
    (path) => pathname === path || pathname.startsWith(`${path}/`),
  );
}

/**
 * The sections of the app, fixed to the bottom of the screen where the thumb is. A section is current in each of its
 * `paths` and under them: Reservas also covers the availability, which is how a booking starts. The crew does not get
 * Clientes because the API answers 403 to them on the customers; until `GET /me` answers, it is shown. Whoever uses it
 * leaves room for it with `pb-16`, the height of the bar.
 */
export function AppNavigation() {
  const pathname = usePathname();
  const me = useMe(true);
  const isCrew = me.data?.role === "crew";

  return (
    <nav
      aria-label={NAVIGATION_TEXTS.label}
      className="fixed inset-x-0 bottom-0 z-10 h-16 border-t border-border bg-background"
    >
      <ul className="mx-auto flex h-full max-w-md items-center gap-1 px-2">
        {SECTIONS.filter((section) => !(isCrew && section.hiddenForCrew)).map(
          ({ href, paths, label, icon: Icon }) => {
            const current = isCurrent(pathname, paths);
            return (
              <li key={href} className="flex-1">
                <Link
                  href={href}
                  aria-current={current ? "page" : undefined}
                  className={`flex min-h-11 flex-col items-center justify-center gap-0.5 rounded-full px-2 py-1 text-sm ${
                    current
                      ? "bg-secondary font-semibold text-secondary-foreground"
                      : "text-muted-foreground"
                  }`}
                >
                  <Icon aria-hidden="true" className="size-5" />
                  {label}
                </Link>
              </li>
            );
          },
        )}
      </ul>
    </nav>
  );
}
