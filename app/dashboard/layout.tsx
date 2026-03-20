"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
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
import { Grid2x2, LayoutDashboard, LogOut, Package, Store } from "lucide-react"
import { toast } from "sonner"

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
    } = supabase.auth.onAuthStateChange((event, session) => {
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
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton
                  asChild
                  isActive={pathname === "/dashboard"}
                  variant="outline"
                  className="h-9"
                >
                  <Link href="/dashboard">
                    <LayoutDashboard className="size-4" />
                    <span>Tableau de bord</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton
                  asChild
                  isActive={pathname === "/dashboard/categories"}
                  variant="outline"
                  className="h-9"
                >
                  <Link href="/dashboard/categories">
                    <Grid2x2 className="size-4" />
                    <span>Categories</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton
                  asChild
                  isActive={pathname === "/dashboard/products"}
                  variant="outline"
                  className="h-9"
                >
                  <Link href="/dashboard/products">
                    <Package className="size-4" />
                    <span>Produits</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
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
        <header className="flex h-14 items-center border-b bg-background/70 px-3 md:px-4 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <SidebarTrigger className="shrink-0" />
          <h1 className="ml-2 truncate text-sm font-medium">Espace de gestion</h1>
        </header>
        <div className="mx-auto w-full max-w-7xl p-3 sm:p-4 md:p-5">{children}</div>
      </SidebarInset>
    </SidebarProvider>
  )
}
