// src/routes/_authenticated.tsx
import { createFileRoute, Outlet, redirect } from "@tanstack/react-router"
import { NavSidebar } from "@/components/nav-sidebar"
import { getSessionFn } from "@/server/auth"

export const Route = createFileRoute("/_authenticated")({
    beforeLoad: async () => {
        const session = await getSessionFn()
        if (!session) throw redirect({ to: "/" })
        return { session }
    },
    component: AuthenticatedLayout,
})

function AuthenticatedLayout() {
    return (
        <>
            <NavSidebar />
            <main className="md:pl-60 min-h-screen pb-16 md:pb-0">
                <Outlet />
            </main>
        </>
    )
}
