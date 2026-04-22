import { TanStackDevtools } from "@tanstack/react-devtools"
import { createRootRoute, HeadContent, Scripts } from "@tanstack/react-router"
import { TanStackRouterDevtoolsPanel } from "@tanstack/react-router-devtools"
import { NavSidebar } from "@/components/nav-sidebar"
import { Providers } from "@/components/providers"
import appCss from "../styles/styles.css?url"

export const Route = createRootRoute({
    head: () => ({
        meta: [
            { title: "FreeShow Admin" },
            { charSet: "utf-8" },
            {
                name: "viewport",
                content: "width=device-width, initial-scale=1"
            },
            {
                name: "theme-color",
                content: "var(--bg-background)"
            }
        ],
        links: [
            {
                rel: "stylesheet",
                href: appCss
            }
        ]
    }),

    shellComponent: RootDocument
})

function RootDocument({ children }: { children: React.ReactNode }) {
    return (
        <html lang="en" suppressHydrationWarning>
            <head>
                <HeadContent />
            </head>

            <body className="min-h-screen bg-background">
                <Providers>
                    <NavSidebar />
                    {/* Main content offset for sidebar on desktop, padding-bottom for mobile nav */}
                    <main className="md:pl-60 min-h-screen pb-16 md:pb-0">
                        {children}
                    </main>
                </Providers>

                <TanStackDevtools
                    config={{
                        position: "bottom-right"
                    }}
                    plugins={[
                        {
                            name: "Tanstack Router",
                            render: <TanStackRouterDevtoolsPanel />
                        }
                    ]}
                />

                <Scripts />
            </body>
        </html>
    )
}
