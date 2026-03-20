"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import type { AuthChangeEvent, Session } from "@supabase/supabase-js"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarSeparator,
  SidebarTrigger,
} from "@/components/ui/sidebar"
import { Button } from "@/components/ui/button"
import { supabase } from "@/lib/supabase"
import { Grid2x2, LayoutDashboard, LogOut, Package, Store, UserRound, ShoppingCart } from "lucide-react"
import { toast } from "sonner"

const NAV_ITEMS = [
  { href: "/dashboard", label: "Tableau de bord", icon: LayoutDashboard },
  { href: "/dashboard/categories", label: "Categories", icon: Grid2x2 },
  { href: "/dashboard/products", label: "Produits", icon: Package },
  { href: "/dashboard/clients", label: "Clients", icon: UserRound },
  { href: "/dashboard/ventes", label: "Ventes", icon: ShoppingCart },
]

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const router = useRouter()
  const pathname = usePathname()
  const [isChecking, setIsChecking] = useState(true)
  const [isSigningOut, setIsSigningOut] = useState(false)

  useEffect(() => {
    let isMounted = true

    async function verifySession() {
      const {
        data: { session },
      } = await supabase.auth.getSession()

      if (!session && isMounted) {
        router.replace("/")
        return
      }

      if (isMounted) {
        setIsChecking(false)
      }
    }

    verifySession()

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event: AuthChangeEvent, session: Session | null) => {
      if (event === "SIGNED_OUT" || !session) {
        router.replace("/")
      }
    })

    return () => {
      isMounted = false
      subscription.unsubscribe()
    }
  }, [router])

  async function handleSignOut() {
    setIsSigningOut(true)
    const { error } = await supabase.auth.signOut({ scope: "local" })
    setIsSigningOut(false)

    if (error) {
      toast.error(error.message || "Erreur lors de la deconnexion")
      return
    }

    toast.success("Deconnexion reussie")
    router.replace("/")
    router.refresh()
  }

  if (isChecking) {
    return (
      <main className="flex min-h-svh items-center justify-center text-sm text-muted-foreground">
        Verification de la session...
      </main>
    )
  }

  return (
    <SidebarProvider defaultOpen>
      <Sidebar variant="inset" collapsible="offcanvas">
        <SidebarHeader className="p-3">
          <div className="flex items-center gap-3 rounded-lg border bg-background/80 p-2">
            <div className="rounded-md bg-primary/10 p-2 text-primary">
              <Store className="size-4" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold">Product Manager</p>
              <p className="text-xs text-muted-foreground">Espace vendeur</p>
            </div>
          </div>
        </SidebarHeader>

        <SidebarSeparator />

        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupLabel className="uppercase tracking-wide text-[11px] text-muted-foreground">
              Navigation
            </SidebarGroupLabel>
            <SidebarMenu className="gap-1.5">
              {NAV_ITEMS.map((item) => {
                const isActive = pathname === item.href
                const Icon = item.icon

                return (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton
                      asChild
                      isActive={isActive}
                      className="h-10 rounded-xl px-2.5 text-[13px] font-medium text-sidebar-foreground/80 transition-all hover:text-sidebar-foreground data-[active=true]:bg-sidebar-accent data-[active=true]:text-sidebar-foreground data-[active=true]:shadow-sm data-[active=true]:ring-1 data-[active=true]:ring-sidebar-border/70"
                    >
                      <Link href={item.href}>
                        <span className="flex size-7 items-center justify-center rounded-lg bg-sidebar-accent/50">
                          <Icon className="size-4" />
                        </span>
                        <span>{item.label}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                )
              })}
            </SidebarMenu>
          </SidebarGroup>
        </SidebarContent>

        <SidebarSeparator />

        <SidebarFooter className="p-3">
          <Button
            variant="outline"
            className="w-full justify-start"
            onClick={handleSignOut}
            disabled={isSigningOut}
          >
            <LogOut className="size-4" />
            {isSigningOut ? "Deconnexion..." : "Se deconnecter"}
          </Button>
        </SidebarFooter>
      </Sidebar>

      <SidebarInset>
        <header className="flex h-14 items-center border-b bg-background/70 px-3 md:px-4 backdrop-blur supports-backdrop-filter:bg-background/60">
          <SidebarTrigger className="shrink-0" />
          <h1 className="ml-2 truncate text-sm font-medium">Espace de gestion</h1>
        </header>
        <div className="mx-auto w-full max-w-7xl p-3 sm:p-4 md:p-5">{children}</div>
      </SidebarInset>
    </SidebarProvider>
  )
}
