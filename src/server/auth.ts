// src/server/auth.ts
import { createServerFn } from "@tanstack/react-start"
import { auth } from "@/lib/auth"
import { defineAbilityFor } from "@/lib/ability"

export async function withAuth() {
    const { getRequest } = await import("@tanstack/react-start/server")
    const request = getRequest()
    const session = await auth.api.getSession({ headers: request.headers })
    if (!session) throw new Error("Unauthorized")
    const ability = defineAbilityFor(session.user)
    return { session, ability }
}

export const getSessionFn = createServerFn({ method: "GET" }).handler(async () => {
    const { getRequest } = await import("@tanstack/react-start/server")
    const request = getRequest()
    return auth.api.getSession({ headers: request.headers })
})
