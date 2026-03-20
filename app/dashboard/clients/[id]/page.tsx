"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { useParams } from "next/navigation"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from "@/components/ui/empty"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import type { Database } from "@/lib/database.types"
import { supabase } from "@/lib/supabase"
import { Loader2, UserRound } from "lucide-react"

type Client = Pick<
  Database["public"]["Tables"]["client"]["Row"],
  "id" | "full_name" | "state" | "adress" | "phone" | "joined_at"
>

type VenteHistory = Pick<
  Database["public"]["Tables"]["vente"]["Row"],
  "id" | "product_id" | "quantity" | "total" | "credit" | "date" | "date_credit"
> & {
  product_name: string
}

function getStartOfDayIso(value: string) {
  const date = new Date(value)
  date.setHours(0, 0, 0, 0)
  return date.toISOString()
}

function formatMoney(value: number | null) {
  if (value === null) {
    return "-"
  }

  return `${value.toFixed(2)} Dt`
}

export default function ClientDetailsPage() {
  const params = useParams<{ id: string }>()
  const clientId = Number(params.id)
  const isValidClientId = Number.isInteger(clientId) && clientId > 0

  const [client, setClient] = useState<Client | null>(null)
  const [history, setHistory] = useState<VenteHistory[]>([])
  const [isLoading, setIsLoading] = useState(isValidClientId)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!isValidClientId) {
      return
    }

    let isMounted = true

    async function loadClientDetails() {
      setIsLoading(true)
      setError(null)

      const { data: clientData, error: clientError } = await supabase
        .from("client")
        .select("id, full_name, state, adress, phone, joined_at")
        .eq("id", clientId)
        .single()

      if (clientError || !clientData) {
        if (isMounted) {
          setClient(null)
          setHistory([])
          setError(clientError?.message || "Client introuvable")
          setIsLoading(false)
        }
        return
      }

      let salesQuery = supabase
        .from("vente")
        .select("id, product_id, quantity, total, credit, date, date_credit")
        .eq("client_id", clientId)
        .order("date", { ascending: true })

      if (clientData.joined_at) {
        salesQuery = salesQuery.gte("date", getStartOfDayIso(clientData.joined_at))
      }

      const { data: salesData, error: salesError } = await salesQuery

      if (salesError) {
        if (isMounted) {
          setClient(clientData as Client)
          setHistory([])
          setError(salesError.message)
          setIsLoading(false)
        }
        return
      }

      const sales = (salesData as Array<Pick<VenteHistory, "id" | "product_id" | "quantity" | "total" | "credit" | "date" | "date_credit">>) ?? []
      const productIds = [...new Set(sales.map((sale) => sale.product_id))]

      let productNameById = new Map<number, string>()
      if (productIds.length > 0) {
        const { data: productRows } = await supabase
          .from("produit")
          .select("id, name")
          .in("id", productIds)

        productNameById = new Map(
          ((productRows as Array<{ id: number; name: string }>) ?? []).map((product) => [product.id, product.name])
        )
      }

      if (isMounted) {
        setClient(clientData as Client)
        setHistory(
          sales.map((sale) => ({
            ...sale,
            product_name: productNameById.get(sale.product_id) ?? `Produit #${sale.product_id}`,
          }))
        )
        setIsLoading(false)
      }
    }

    void loadClientDetails()

    return () => {
      isMounted = false
    }
  }, [clientId, isValidClientId])

  const totalPurchases = useMemo(
    () => history.reduce((sum, sale) => sum + (sale.total ?? 0), 0),
    [history]
  )
  const totalCredits = useMemo(
    () => history.reduce((sum, sale) => sum + (sale.credit ?? 0), 0),
    [history]
  )

  return (
    <section className="space-y-5 rounded-xl border bg-card p-3 shadow-sm sm:p-4 md:p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
        <div className="flex items-start gap-3">
          <div className="rounded-xl bg-muted p-2.5">
            <UserRound className="size-4" />
          </div>
          <div>
            <h2 className="text-lg font-semibold sm:text-xl">Information client</h2>
            {client && (
              <p className="text-sm text-muted-foreground">
                {client.full_name} - depuis {client.joined_at ? new Date(client.joined_at).toLocaleDateString() : "date inconnue"}
              </p>
            )}
          </div>
        </div>

        <Button variant="outline" size="sm" asChild>
          <Link href="/dashboard/clients">Retour clients</Link>
        </Button>
      </div>

      {isLoading && (
        <div className="flex items-center gap-2 rounded-lg border bg-muted/30 px-3 py-2 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" />
          Chargement des achats du client...
        </div>
      )}

      {!isLoading && error && <p className="text-sm text-destructive">Erreur: {error}</p>}

      {!isValidClientId && <p className="text-sm text-destructive">Erreur: Client invalide</p>}

      {!isLoading && !error && client && (
        <>
          <div className="rounded-xl border bg-muted/15 p-3">
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-4">
              <div className="rounded-lg border bg-background px-3 py-2 text-sm">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Etat</p>
                <div className="mt-1">
                  <Badge
                    variant="outline"
                    className={client.state ? "bg-green-100 text-green-800 border-green-300" : "bg-gray-100 text-gray-700 border-gray-300"}
                  >
                    {client.state ? "Actif" : "Inactif"}
                  </Badge>
                </div>
              </div>
              <div className="rounded-lg border bg-background px-3 py-2 text-sm">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Nb achats</p>
                <p className="mt-1 text-lg font-semibold leading-none">{history.length}</p>
              </div>
              <div className="rounded-lg border bg-background px-3 py-2 text-sm">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Total achats</p>
                <p className="mt-1 text-lg font-semibold leading-none">{totalPurchases.toFixed(2)} Dt</p>
              </div>
              <div className="rounded-lg border bg-background px-3 py-2 text-sm">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Total credit</p>
                <p className="mt-1 text-lg font-semibold leading-none">{totalCredits.toFixed(2)} Dt</p>
              </div>
            </div>

            <div className="mt-3 grid grid-cols-1 gap-2 text-sm sm:grid-cols-2">
              <div className="rounded-lg border bg-background px-3 py-2">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Telephone</p>
                <p className="mt-1 font-medium">{client.phone || "-"}</p>
              </div>
              <div className="rounded-lg border bg-background px-3 py-2">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Adresse</p>
                <p className="mt-1 font-medium">{client.adress || "-"}</p>
              </div>
            </div>
          </div>

          {history.length === 0 ? (
            <Empty className="border">
              <EmptyHeader>
                <EmptyTitle>Aucun achat</EmptyTitle>
                  <EmptyDescription>Ce client n&apos;a pas encore d&apos;achats depuis son inscription.</EmptyDescription>
              </EmptyHeader>
            </Empty>
          ) : (
            <div className="rounded-xl border">
              <div className="overflow-x-auto">
                <Table className="min-w-190">
                <TableHeader>
                  <TableRow>
                    <TableHead className="whitespace-nowrap">Date</TableHead>
                    <TableHead>Produit</TableHead>
                    <TableHead>Quantite</TableHead>
                    <TableHead>Total</TableHead>
                    <TableHead>Credit</TableHead>
                    <TableHead className="whitespace-nowrap">Date credit</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {history.map((sale) => (
                    <TableRow key={sale.id}>
                      <TableCell className="whitespace-nowrap">{sale.date ? new Date(sale.date).toLocaleString() : "-"}</TableCell>
                      <TableCell>{sale.product_name}</TableCell>
                      <TableCell>{sale.quantity}</TableCell>
                      <TableCell>{formatMoney(sale.total)}</TableCell>
                      <TableCell>{formatMoney(sale.credit)}</TableCell>
                      <TableCell className="whitespace-nowrap">{sale.date_credit ? new Date(sale.date_credit).toLocaleString() : "-"}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              </div>
            </div>
          )}
        </>
      )}
    </section>
  )
}
