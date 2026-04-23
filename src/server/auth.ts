import { createServerFn } from "@tanstack/react-start"

export const getSessionFn = createServerFn({ method: "GET" }).handler(async () => {
    const { getSessionImpl } = await import("./auth.server")
    return getSessionImpl()
})
