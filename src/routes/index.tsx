import { createFileRoute, redirect } from "@tanstack/react-router"
import { AuthView } from "@daveyplate/better-auth-ui"
import { getSessionFn } from "@/server/auth"

export const Route = createFileRoute("/")({
    beforeLoad: async () => {
        const session = await getSessionFn()
        if (session) throw redirect({ to: "/dashboard" })
    },
    component: LoginPage,
})

function LoginPage() {
    return (
        <div className="flex min-h-screen items-center justify-center p-6">
            <div className="w-full max-w-sm">
                <div className="mb-8 text-center">
                    <p className="font-display text-xl font-bold tracking-tight text-primary">
                        FreeShow Admin
                    </p>
                </div>
                <AuthView path="sign-in" />
            </div>
        </div>
    )
}
