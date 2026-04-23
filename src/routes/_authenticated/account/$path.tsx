import { AccountView } from "@daveyplate/better-auth-ui"
import { createFileRoute } from "@tanstack/react-router"

export const Route = createFileRoute("/_authenticated/account/$path" as any)({
    component: RouteComponent,
})

function RouteComponent() {
    const { path } = Route.useParams()
    return (
        <main className="container mx-auto p-4 md:p-6">
            <AccountView
                classNames={{ sidebar: { base: "sticky top-20" } }}
                path={path}
            />
        </main>
    )
}
