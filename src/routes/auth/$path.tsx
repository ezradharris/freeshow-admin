import { AuthView } from "@daveyplate/better-auth-ui"
import { createFileRoute } from "@tanstack/react-router"

export const Route = createFileRoute("/auth/$path")({
    component: RouteComponent
})

function RouteComponent() {
    const { path } = Route.useParams()

    return (
        <div className="flex min-h-screen items-center justify-center p-6">
            <div className="w-full max-w-sm">
                <div className="mb-8 text-center">
                    <p className="font-display text-xl font-bold tracking-tight text-primary">
                        Chronicles
                    </p>
                </div>
                <AuthView path={path} />
            </div>
        </div>
    )
}
