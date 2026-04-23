import { AbilityBuilder, createMongoAbility, type MongoAbility } from "@casl/ability"

type Actions = "manage" | "create" | "read" | "update" | "delete"
type Subjects = "all" | "Song" | "Show" | "Settings" | "History" | "Share"

export type AppAbility = MongoAbility<[Actions, Subjects]>

export function defineAbilityFor(user: { id: string } | null): AppAbility {
    const { can, build } = new AbilityBuilder<AppAbility>(createMongoAbility)
    if (user) can("manage", "all")
    return build()
}
