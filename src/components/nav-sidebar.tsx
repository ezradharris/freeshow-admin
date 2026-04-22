import { UserButton } from "@daveyplate/better-auth-ui"
import { Link, useRouterState } from "@tanstack/react-router"
import {
    Download,
    FolderOpen,
    History,
    LayoutDashboard,
    MonitorPlay,
    Music,
    Settings,
    Upload,
} from "lucide-react"
import type { LucideIcon } from "lucide-react"
import { ModeToggle } from "./mode-toggle"

const NAV_ITEMS = [
    { to: "/", label: "Dashboard", icon: LayoutDashboard },
    { to: "/songs", label: "Songs", icon: Music },
    { to: "/shows", label: "Shows", icon: MonitorPlay },
    { to: "/projects", label: "Projects", icon: FolderOpen },
    { to: "/import", label: "Import", icon: Upload },
    { to: "/export", label: "Export", icon: Download },
    { to: "/history", label: "History", icon: History },
    { to: "/settings", label: "Settings", icon: Settings },
] as const

type NavItem = {
    to: string
    label: string
    icon: LucideIcon
}

function isActive(pathname: string, to: string) {
    if (to === "/") return pathname === "/"
    return pathname.startsWith(to)
}

function NavLink({ to, label, icon: Icon }: NavItem) {
    const pathname = useRouterState({ select: (s) => s.location.pathname })
    const active = isActive(pathname, to)

    return (
        <Link
            to={to}
            className={`flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors ${
                active
                    ? "bg-muted font-medium"
                    : "hover:bg-muted/50"
            }`}
        >
            <Icon
                className={`h-4 w-4 shrink-0 ${active ? "text-primary" : ""}`}
            />
            {label}
        </Link>
    )
}

function MobileNavLink({ to, label, icon: Icon }: NavItem) {
    const pathname = useRouterState({ select: (s) => s.location.pathname })
    const active = isActive(pathname, to)

    return (
        <Link
            to={to}
            className="flex flex-1 flex-col items-center gap-1 py-2"
        >
            <Icon
                className={`h-5 w-5 ${active ? "text-primary" : ""}`}
            />
            <span
                className={`text-xs ${active ? "text-primary" : ""}`}
            >
                {label}
            </span>
        </Link>
    )
}

export function NavSidebar() {
    const pathname = useRouterState({ select: (s) => s.location.pathname })
    if (pathname.startsWith("/s/")) return null

    return (
        <>
            {/* Desktop sidebar */}
            <aside className="hidden md:flex fixed inset-y-0 left-0 w-60 flex-col border-r bg-background z-40">
                <div className="flex h-14 items-center border-b px-4 font-semibold">
                    FreeShow Admin
                </div>

                <nav className="flex flex-col gap-1 p-2 flex-1 overflow-y-auto">
                    {NAV_ITEMS.map((item) => (
                        <NavLink key={item.to} {...item} />
                    ))}
                </nav>

                <div className="border-t p-2 flex items-center justify-between">
                    <UserButton size="sm" />
                    <ModeToggle />
                </div>
            </aside>

            {/* Mobile bottom tab bar */}
            <nav className="md:hidden fixed bottom-0 inset-x-0 z-40 flex border-t bg-background pb-safe">
                {NAV_ITEMS.slice(0, 5).map((item) => (
                    <MobileNavLink key={item.to} {...item} />
                ))}
            </nav>
        </>
    )
}
