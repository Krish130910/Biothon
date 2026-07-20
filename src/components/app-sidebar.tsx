import { Link, useRouterState } from "@tanstack/react-router";
import {
  ShieldCheck,
  ClipboardList,
  LayoutDashboard,
  Info,
  LifeBuoy,
  User,
  ScanLine,
  Brain,
  Activity,
  Stethoscope,
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarFooter,
} from "@/components/ui/sidebar";
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@/components/ui/tooltip";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { useLanguage, tr, type Lang } from "@/lib/i18n";

const product = [
  { to: "/dashboard",  labelKey: "dashboard",       icon: LayoutDashboard },
  { to: "/assessment", labelKey: "healthAssessment", icon: ClipboardList  },
  { to: "/scanner",    labelKey: "foodScanner",      icon: ScanLine        },
  { to: "/profile",    labelKey: "profile",          icon: User            },
] as const;

const clinical = [
  { to: "/action-plan",   labelKey: "actionPlan",   icon: Brain       },
  { to: "/progress",      labelKey: "progress",     icon: Activity    },
  { to: "/expert-review", labelKey: "expertReview", icon: Stethoscope },
] as const;

const more = [
  { to: "/about",   labelKey: "about",   icon: Info    },
  { to: "/contact", labelKey: "support", icon: LifeBuoy },
] as const;

type NavItem = {
  to: string;
  labelKey: string;
  icon: React.ElementType;
};

function NavIcon({ item, pathname, currentLang }: { item: NavItem; pathname: string; currentLang: Lang }) {
  const label = tr(item.labelKey, currentLang);
  const active = pathname === item.to;

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Link
          to={item.to}
          aria-label={label}
          className={cn(
            // base — perfectly centered 44×44 rounded square
            "flex items-center justify-center w-11 h-11 rounded-xl",
            "border transition-all duration-200 ease-in-out select-none outline-none",
            active
              ? // active: soft teal fill + subtle border, no glow, no float
                "bg-teal/10 text-teal border-teal/25"
              : // rest: transparent, dim icon; on hover slight tint + icon teal
                "bg-transparent text-sidebar-foreground/55 border-transparent hover:bg-teal/[0.055] hover:text-teal hover:border-teal/10"
          )}
        >
          <item.icon
            className="h-[18px] w-[18px] shrink-0 transition-colors duration-200"
            strokeWidth={active ? 2.3 : 1.9}
          />
        </Link>
      </TooltipTrigger>
      <TooltipContent
        side="right"
        sideOffset={14}
        className="bg-popover text-popover-foreground border border-border/60 shadow-md text-[12px] font-semibold py-1.5 px-3 rounded-lg"
      >
        {label}
      </TooltipContent>
    </Tooltip>
  );
}

export function AppSidebar() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const currentLang = useLanguage();

  return (
    <TooltipProvider delayDuration={300}>
      <Sidebar
        collapsible="none"
        className="border-r border-sidebar-border [&_[data-sidebar=sidebar]]:bg-sidebar w-[80px] min-w-[80px] max-w-[80px] h-screen"
      >
        {/* ── Logo ─────────────────────────────── */}
        <SidebarHeader className="h-14 flex items-center justify-center border-b border-sidebar-border shrink-0">
          <Tooltip>
            <TooltipTrigger asChild>
              <Link
                to="/"
                aria-label="HealthGuard Home"
                className="flex items-center justify-center w-10 h-10 rounded-xl bg-teal/10 border border-teal/20 text-teal transition-all duration-200 hover:bg-teal/15 hover:border-teal/30"
              >
                <ShieldCheck className="h-5 w-5" strokeWidth={2.4} />
              </Link>
            </TooltipTrigger>
            <TooltipContent side="right" sideOffset={14} className="bg-popover text-popover-foreground border border-border/60 shadow-md text-[12px] font-semibold py-1.5 px-3 rounded-lg">
              HealthGuard
            </TooltipContent>
          </Tooltip>
        </SidebarHeader>

        {/* ── Navigation ───────────────────────── */}
        <SidebarContent className="flex flex-col items-center gap-0 py-4 overflow-y-auto overflow-x-hidden scrollbar-none">

          {/* Section 1 — Product */}
          <nav className="flex flex-col items-center gap-1.5 w-full px-2">
            {product.map((item) => (
              <NavIcon key={item.to} item={item} pathname={pathname} currentLang={currentLang} />
            ))}
          </nav>

          {/* Divider */}
          <div className="py-3 w-full px-4">
            <Separator className="bg-sidebar-border/50" />
          </div>

          {/* Section 2 — Clinical */}
          <nav className="flex flex-col items-center gap-1.5 w-full px-2">
            {clinical.map((item) => (
              <NavIcon key={item.to} item={item} pathname={pathname} currentLang={currentLang} />
            ))}
          </nav>

          {/* Divider */}
          <div className="py-3 w-full px-4">
            <Separator className="bg-sidebar-border/50" />
          </div>

          {/* Section 3 — Resources */}
          <nav className="flex flex-col items-center gap-1.5 w-full px-2">
            {more.map((item) => (
              <NavIcon key={item.to} item={item} pathname={pathname} currentLang={currentLang} />
            ))}
          </nav>
        </SidebarContent>

        {/* ── Footer version tag ───────────────── */}
        <SidebarFooter className="h-10 flex items-center justify-center border-t border-sidebar-border/40 shrink-0">
          <span className="text-[9px] font-semibold uppercase tracking-[0.2em] text-sidebar-foreground/30 select-none">
            v1.0
          </span>
        </SidebarFooter>
      </Sidebar>
    </TooltipProvider>
  );
}
