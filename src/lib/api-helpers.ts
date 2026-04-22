import { auth } from "@/lib/auth"

export async function requireSession(request: Request) {
    const session = await auth.api.getSession({ headers: request.headers })
    if (!session) {
        throw new Response(JSON.stringify({ error: "Unauthorized" }), {
            status: 401,
            headers: { "Content-Type": "application/json" }
        })
    }
    return session
}

export function jsonResponse(data: unknown, status = 200) {
    return new Response(JSON.stringify(data), {
        status,
        headers: { "Content-Type": "application/json" }
    })
}

export function errorResponse(message: string, status: number) {
    return jsonResponse({ error: message }, status)
}
