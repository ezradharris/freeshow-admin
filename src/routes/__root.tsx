import { TanStackDevtools } from "@tanstack/react-devtools"
import { createRootRoute, HeadContent, Scripts } from "@tanstack/react-router"
import { TanStackRouterDevtoolsPanel } from "@tanstack/react-router-devtools"
import { Providers } from "@/components/providers"
import appCss from "../styles/styles.css?url"

export const Route = createRootRoute({
    head: () => ({
        meta: [
            { title: "Chronicles" },
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
            { rel: "stylesheet", href: appCss },
            { rel: "preconnect", href: "https://fonts.googleapis.com" },
            { rel: "preconnect", href: "https://fonts.gstatic.com" },
            {
                rel: "stylesheet",
                href: "https://fonts.googleapis.com/css2?family=Barlow:ital,wght@0,100;0,200;0,300;0,400;0,500;0,600;0,700;0,800;0,900;1,100;1,200;1,300;1,400;1,500;1,600;1,700;1,800;1,900&display=swap"
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
                    {children}
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
