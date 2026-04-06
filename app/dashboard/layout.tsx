"use client"

import { useEffect, useRef, useState } from "react"
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { supabase } from "@/lib/supabase"
import { Grid2x2, LayoutDashboard, LogOut, Package, Store, Trash2, UserRound, ShoppingCart } from "lucide-react"
import { toast } from "sonner"

const NAV_ITEMS = [
  { href: "/dashboard", label: "Tableau de bord", icon: LayoutDashboard },
  { href: "/dashboard/categories", label: "Categories", icon: Grid2x2 },
  { href: "/dashboard/products", label: "Produits", icon: Package },
  { href: "/dashboard/clients", label: "Clients", icon: UserRound },
  { href: "/dashboard/ventes", label: "Ventes", icon: ShoppingCart },
]

function getSidebarItemToneClass(href: string) {
  if (href === "/dashboard/products") {
    return "sidebar-item-tone sidebar-item-products"
  }

  if (href === "/dashboard/clients") {
    return "sidebar-item-tone sidebar-item-clients"
  }

  if (href === "/dashboard/ventes") {
    return "sidebar-item-tone sidebar-item-ventes"
  }

  return ""
}

function getSidebarIconToneClass(href: string) {
  if (href === "/dashboard/products") {
    return "sidebar-icon-tone sidebar-icon-products"
  }

  if (href === "/dashboard/clients") {
    return "sidebar-icon-tone sidebar-icon-clients"
  }

  if (href === "/dashboard/ventes") {
    return "sidebar-icon-tone sidebar-icon-ventes"
  }

  return "bg-sidebar-accent/50"
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const router = useRouter()
  const pathname = usePathname()
  const [isChecking, setIsChecking] = useState(true)
  const [isSigningOut, setIsSigningOut] = useState(false)
  const [isClearingData, setIsClearingData] = useState(false)
  const loginLinkRef = useRef<HTMLAnchorElement | null>(null)

  useEffect(() => {
    let isMounted = true

    async function verifySession() {
      let sessionFound: Session | null = null

      for (let attempt = 0; attempt < 3; attempt += 1) {
        const {
          data: { session },
        } = await supabase.auth.getSession()

        if (session) {
          sessionFound = session
          break
        }

        await new Promise((resolve) => window.setTimeout(resolve, 120))
      }

      if (!sessionFound && isMounted) {
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

    // Link-based fallback if auth listener redirect is delayed.
    window.setTimeout(() => {
      if (window.location.pathname !== "/") {
        loginLinkRef.current?.click()
      }
    }, 120)
  }

  async function handleClearAllData() {
    setIsClearingData(true)

    const { error: salesError } = await supabase.from("vente").delete().not("id", "is", null)
    if (salesError) {
      setIsClearingData(false)
      toast.error(salesError.message || "Erreur lors de la suppression des ventes")
      return
    }

    const { error: productsError } = await supabase.from("produit").delete().not("id", "is", null)
    if (productsError) {
      setIsClearingData(false)
      toast.error(productsError.message || "Erreur lors de la suppression des produits")
      return
    }

    const { error: categoriesError } = await supabase.from("categorie").delete().not("id", "is", null)
    if (categoriesError) {
      setIsClearingData(false)
      toast.error(categoriesError.message || "Erreur lors de la suppression des categories")
      return
    }

    const { error: clientsError } = await supabase.from("client").delete().not("id", "is", null)
    setIsClearingData(false)

    if (clientsError) {
      toast.error(clientsError.message || "Erreur lors de la suppression des clients")
      return
    }

    toast.success("Toutes les donnees ont ete supprimees")
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
            <SidebarMenu className="gap-2">
              {NAV_ITEMS.map((item) => {
                const isActive = pathname === item.href
                const Icon = item.icon

                return (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton
                      asChild
                      isActive={isActive}
                      className={cn(
                        "h-12 rounded-xl px-1 text-base font-bold text-sidebar-foreground/80 transition-all hover:text-sidebar-foreground data-[active=true]:shadow-sm lg:h-12 lg:px-3 lg:text-[15px]",
                        getSidebarItemToneClass(item.href)
                      )}
                    >
                      <Link href={item.href}>
                        <span className={cn("flex size-10 items-center justify-center rounded-lg lg:size-10", getSidebarIconToneClass(item.href))}>
                          <Icon className="size-5 lg:size-5" />
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
          <Link ref={loginLinkRef} href="/" className="hidden" prefetch>
            Login
          </Link>
          <Button
            variant="outline"
            className="w-full justify-start"
            onClick={handleSignOut}
            disabled={isSigningOut}
          >
            <LogOut className="size-4" />
            {isSigningOut ? "Deconnexion..." : "Se deconnecter"}
          </Button>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" className="mt-2 w-full justify-start" disabled={isClearingData}>
                <Trash2 className="size-4" />
                {isClearingData ? "Suppression..." : "Supprimer tous"}
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Supprimer toutes les donnees ?</AlertDialogTitle>
                <AlertDialogDescription>
                  Cette action est irreversible. Toutes les ventes, produits, categories et clients seront
                  supprimes.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Annuler</AlertDialogCancel>
                <AlertDialogAction
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  onClick={handleClearAllData}
                  disabled={isClearingData}
                >
                  Confirmer la suppression
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
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
