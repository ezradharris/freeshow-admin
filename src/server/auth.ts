// src/server/auth.ts
import { createServerFn } from "@tanstack/react-start"
import { getRequest } from "@tanstack/react-start/server"
import { auth } from "@/lib/auth"
import { defineAbilityFor } from "@/lib/ability"

export async function withAuth() {
    const request = getRequest()
    const session = await auth.api.getSession({ headers: request.headers })
    if (!session) throw new Error("Unauthorized")
    const ability = defineAbilityFor(session.user)
    return { session, ability }
}

export const getSessionFn = createServerFn({ method: "GET" }).handler(async () => {
    const request = getRequest()
    return auth.api.getSession({ headers: request.headers })
})
