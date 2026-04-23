import { describe, it, expect } from "vitest"
import { defineAbilityFor } from "./ability"

describe("defineAbilityFor", () => {
    it("grants all permissions when user is present", () => {
        const ability = defineAbilityFor({ id: "user-1" })
        expect(ability.can("manage", "Song")).toBe(true)
        expect(ability.can("create", "Show")).toBe(true)
        expect(ability.can("delete", "Settings")).toBe(true)
    })

    it("denies all permissions when user is null", () => {
        const ability = defineAbilityFor(null)
        expect(ability.can("read", "Song")).toBe(false)
        expect(ability.can("manage", "all")).toBe(false)
    })
})
