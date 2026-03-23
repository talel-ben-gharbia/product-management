"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from "@/components/ui/empty"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import type { Database } from "@/lib/database.types"
import { supabase } from "@/lib/supabase"
import { Banknote, Loader2, ShoppingBag, TrendingUp, Wallet } from "lucide-react"
import { Area, AreaChart, CartesianGrid, XAxis } from "recharts"

type Product = Pick<Database["public"]["Tables"]["produit"]["Row"], "id" | "name" | "price">
type Client = Pick<Database["public"]["Tables"]["client"]["Row"], "id" | "full_name">
type Sale = Pick<Database["public"]["Tables"]["vente"]["Row"], "id" | "product_id" | "client_id" | "quantity" | "price" | "total" | "credit" | "date">

type ProfitPoint = {
  key: string
  label: string
  revenue: number
  cost: number
  net: number
}

type TimeFilter = "day" | "month" | "year"

const RANGE_LIMITS: Record<TimeFilter, { min: number; max: number; defaultValue: number; label: string }> = {
  day: { min: 1, max: 365, defaultValue: 7, label: "jours" },
  month: { min: 1, max: 36, defaultValue: 6, label: "mois" },
  year: { min: 1, max: 20, defaultValue: 5, label: "annees" },
}

function monthKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`
}

function monthLabel(key: string) {
  const [year, month] = key.split("-").map(Number)
  return new Date(year, month - 1, 1).toLocaleDateString("fr-FR", { month: "short", year: "numeric" })
}

function money(value: number) {
  return `${value.toFixed(2)} Dt`
}

const chartConfig = {
  net: {
    label: "Reba7 safi",
    color: "var(--chart-1)",
  },
  revenue: {
    label: "Chiffre d'affaires",
    color: "var(--chart-2)",
  },
} satisfies ChartConfig

export default function DashboardPage() {
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [timeFilter, setTimeFilter] = useState<TimeFilter>("month")
  const [rangeCountByFilter, setRangeCountByFilter] = useState<Record<TimeFilter, number>>({
    day: RANGE_LIMITS.day.defaultValue,
    month: RANGE_LIMITS.month.defaultValue,
    year: RANGE_LIMITS.year.defaultValue,
  })

  const [products, setProducts] = useState<Product[]>([])
  const [clients, setClients] = useState<Client[]>([])
  const [sales, setSales] = useState<Sale[]>([])

  useEffect(() => {
    let isMounted = true

    async function loadDashboard() {
      setIsLoading(true)
      setError(null)

      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser()

      if (authError || !user) {
        if (isMounted) {
          setError("Session invalide. Reconnectez-vous.")
          setIsLoading(false)
        }
        return
      }

      const { data: productsData, error: productsError } = await supabase
        .from("produit")
        .select("id, name, price")

      if (productsError) {
        if (isMounted) {
          setError(productsError.message)
          setIsLoading(false)
        }
        return
      }

      const ownedProducts = (productsData as Product[]) ?? []
      const ownedProductIds = ownedProducts.map((product) => product.id)

      if (ownedProductIds.length === 0) {
        if (isMounted) {
          setProducts([])
          setSales([])
          setIsLoading(false)
        }
        return
      }

      const { data: salesData, error: salesError } = await supabase
        .from("vente")
        .select("id, product_id, client_id, quantity, price, total, credit, date")
        .in("product_id", ownedProductIds)
        .order("date", { ascending: false })

      if (salesError) {
        if (isMounted) {
          setError(salesError.message)
          setIsLoading(false)
        }
        return
      }

      const { data: clientsData, error: clientsError } = await supabase
        .from("client")
        .select("id, full_name")
        .order("full_name", { ascending: true })

      if (clientsError) {
        if (isMounted) {
          setError(clientsError.message)
          setIsLoading(false)
        }
        return
      }

      if (isMounted) {
        setProducts(ownedProducts)
        setClients((clientsData as Client[]) ?? [])
        setSales((salesData as Sale[]) ?? [])
        setIsLoading(false)
      }
    }

    void loadDashboard()

    return () => {
      isMounted = false
    }
  }, [])

  const productCostById = useMemo(
    () => new Map(products.map((product) => [product.id, product.price ?? 0])),
    [products]
  )

  const productNameById = useMemo(
    () => new Map(products.map((product) => [product.id, product.name])),
    [products]
  )

  const clientNameById = useMemo(
    () => new Map(clients.map((client) => [client.id, client.full_name])),
    [clients]
  )

  const activeRangeCount = rangeCountByFilter[timeFilter]

  const { profitPoints, salesInRange, periodLabel } = useMemo(() => {
    const now = new Date()
    const map = new Map<string, ProfitPoint>()
    const count = Math.max(RANGE_LIMITS[timeFilter].min, Math.min(activeRangeCount, RANGE_LIMITS[timeFilter].max))

    if (timeFilter === "day") {
      for (let index = count - 1; index >= 0; index -= 1) {
        const date = new Date(now.getFullYear(), now.getMonth(), now.getDate() - index)
        const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`
        map.set(key, {
          key,
          label: date.toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit" }),
          revenue: 0,
          cost: 0,
          net: 0,
        })
      }
    }

    if (timeFilter === "month") {
      for (let index = count - 1; index >= 0; index -= 1) {
        const date = new Date(now.getFullYear(), now.getMonth() - index, 1)
        const key = monthKey(date)
        map.set(key, {
          key,
          label: monthLabel(key),
          revenue: 0,
          cost: 0,
          net: 0,
        })
      }
    }

    if (timeFilter === "year") {
      for (let index = count - 1; index >= 0; index -= 1) {
        const year = now.getFullYear() - index
        const key = String(year)
        map.set(key, {
          key,
          label: key,
          revenue: 0,
          cost: 0,
          net: 0,
        })
      }
    }

    const includedSales: Sale[] = []

    for (const sale of sales) {
      if (!sale.date) {
        continue
      }

      const saleDate = new Date(sale.date)
      const key =
        timeFilter === "day"
          ? `${saleDate.getFullYear()}-${String(saleDate.getMonth() + 1).padStart(2, "0")}-${String(saleDate.getDate()).padStart(2, "0")}`
          : timeFilter === "month"
            ? monthKey(saleDate)
            : String(saleDate.getFullYear())

      const bucket = map.get(key)
      if (!bucket) {
        continue
      }

      includedSales.push(sale)
      const revenue = sale.total ?? ((sale.price ?? 0) * sale.quantity)
      const cost = (productCostById.get(sale.product_id) ?? 0) * sale.quantity
      bucket.revenue += revenue
      bucket.cost += cost
      bucket.net += revenue - cost
    }

    const points = [...map.values()]
    const period = `${count} derniers ${RANGE_LIMITS[timeFilter].label}`

    return {
      profitPoints: points,
      salesInRange: includedSales,
      periodLabel: period,
    }
  }, [sales, timeFilter, productCostById, activeRangeCount])

  const unpaidCredit = useMemo(
    () => salesInRange.reduce((sum, sale) => sum + (sale.credit && sale.credit > 0 ? sale.credit : 0), 0),
    [salesInRange]
  )

  const unpaidCount = useMemo(
    () => salesInRange.filter((sale) => sale.credit !== null && sale.credit > 0).length,
    [salesInRange]
  )

  const unpaidSales = useMemo(
    () => salesInRange.filter((sale) => sale.credit !== null && sale.credit > 0),
    [salesInRange]
  )

  const totalRevenue = useMemo(
    () => salesInRange.reduce((sum, sale) => sum + (sale.total ?? ((sale.price ?? 0) * sale.quantity)), 0),
    [salesInRange]
  )

  const totalNetProfit = useMemo(
    () => salesInRange.reduce((sum, sale) => {
      const revenue = sale.total ?? ((sale.price ?? 0) * sale.quantity)
      const cost = (productCostById.get(sale.product_id) ?? 0) * sale.quantity
      return sum + (revenue - cost)
    }, 0),
    [salesInRange, productCostById]
  )

  const monthlyChartData = useMemo(
    () =>
      profitPoints.map((point) => ({
        month: point.label,
        net: Number(point.net.toFixed(2)),
        revenue: Number(point.revenue.toFixed(2)),
      })),
    [profitPoints]
  )

  const profitTrendText = useMemo(() => {
    if (profitPoints.length < 2) {
      return "Pas assez de donnees"
    }

    const current = profitPoints[profitPoints.length - 1].net
    const previous = profitPoints[profitPoints.length - 2].net

    if (previous === 0) {
      return current >= 0 ? "Mois en progression" : "Mois en baisse"
    }

    const change = ((current - previous) / Math.abs(previous)) * 100
    const direction = change >= 0 ? "hausse" : "baisse"
    return `${direction} ${Math.abs(change).toFixed(1)}% vs periode precedente`
  }, [profitPoints])

  const handleTimeFilterChange = (nextFilter: TimeFilter) => {
    setTimeFilter(nextFilter)
  }

  const handleRangeCountChange = (value: string) => {
    const parsed = Number(value)
    const safe = Number.isNaN(parsed)
      ? RANGE_LIMITS[timeFilter].min
      : Math.max(RANGE_LIMITS[timeFilter].min, Math.min(parsed, RANGE_LIMITS[timeFilter].max))

    setRangeCountByFilter((prev) => ({
      ...prev,
      [timeFilter]: safe,
    }))
  }

  const bestSellingProduct = useMemo(() => {
    const quantityByProduct = new Map<number, number>()
    for (const sale of salesInRange) {
      quantityByProduct.set(
        sale.product_id,
        (quantityByProduct.get(sale.product_id) ?? 0) + sale.quantity
      )
    }

    let bestProductId: number | null = null
    let bestQuantity = 0

    for (const [productId, quantity] of quantityByProduct) {
      if (quantity > bestQuantity) {
        bestProductId = productId
        bestQuantity = quantity
      }
    }

    if (bestProductId === null) {
      return null
    }

    return {
      name: productNameById.get(bestProductId) ?? `Produit #${bestProductId}`,
      quantity: bestQuantity,
    }
  }, [salesInRange, productNameById])

  return (
    <section className="space-y-4 rounded-xl border bg-card p-2.5 shadow-sm sm:p-4 md:p-5">
      <div>
        <h2 className="text-xl font-semibold">Tableau de bord</h2>
        <p className="text-sm text-muted-foreground">
          Suivi des performances: profits, credits non payes et tendances de vente.
        </p>
      </div>

      {isLoading && (
        <div className="flex items-center gap-2 rounded-lg border bg-muted/30 px-3 py-2 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" />
          Chargement du dashboard...
        </div>
      )}

      {!isLoading && error && <p className="text-sm text-destructive">Erreur: {error}</p>}

      {!isLoading && !error && sales.length === 0 && (
        <Empty className="border">
          <EmptyHeader>
            <EmptyTitle>Pas encore de ventes</EmptyTitle>
            <EmptyDescription>
              Ajoutez des ventes pour voir les indicateurs du dashboard.
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      )}

      {!isLoading && !error && sales.length > 0 && (
        <>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <article className="rounded-lg border bg-muted/20 p-3">
              <div className="mb-2 inline-flex rounded-md bg-background p-1.5">
                <TrendingUp className="size-4" />
              </div>
              <p className="text-sm text-muted-foreground">Profits totaux</p>
              <p className="text-lg font-semibold">{money(totalNetProfit)}</p>
            </article>

            <article className="rounded-lg border bg-muted/20 p-3">
              <div className="mb-2 inline-flex rounded-md bg-background p-1.5">
                <Wallet className="size-4" />
              </div>
              <p className="text-sm text-muted-foreground">Chiffre d&apos;affaires</p>
              <p className="text-lg font-semibold">{money(totalRevenue)}</p>
            </article>

            <article className="rounded-lg border bg-muted/20 p-3">
              <div className="mb-2 inline-flex rounded-md bg-background p-1.5">
                <Banknote className="size-4" />
              </div>
              <p className="text-sm text-muted-foreground">Credit non paye</p>
              <p className="text-lg font-semibold">{money(unpaidCredit)}</p>
              <p className="text-xs text-muted-foreground">{unpaidCount} vente(s) en credit</p>
            </article>

            <article className="rounded-lg border bg-muted/20 p-3">
              <div className="mb-2 inline-flex rounded-md bg-background p-1.5">
                <ShoppingBag className="size-4" />
              </div>
              <p className="text-sm text-muted-foreground">Produit le plus vendu</p>
              {bestSellingProduct ? (
                <>
                  <p className="text-base font-semibold">{bestSellingProduct.name}</p>
                  <p className="text-xs text-muted-foreground">{bestSellingProduct.quantity} unite(s) vendues</p>
                </>
              ) : (
                <p className="text-sm text-muted-foreground">Aucune vente</p>
              )}
            </article>
          </div>

          <Card>
            <CardHeader className="gap-2 p-3 sm:p-4">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <CardTitle>Area Chart - Stacked</CardTitle>
                  <CardDescription>Profits et chiffre d&apos;affaires - {periodLabel}</CardDescription>
                </div>
                <div className="flex w-full flex-row items-center justify-start gap-2 sm:w-auto sm:justify-end">
                  <div className="flex items-center gap-2 rounded-md border bg-muted/20 p-1">
                    <span className="pl-1.5 text-xs text-muted-foreground">Nb:</span>
                    <Input
                      type="number"
                      min={String(RANGE_LIMITS[timeFilter].min)}
                      max={String(RANGE_LIMITS[timeFilter].max)}
                      value={String(rangeCountByFilter[timeFilter])}
                      onChange={(event) => handleRangeCountChange(event.target.value)}
                      className="h-8 w-20"
                    />
                    <span className="pr-1.5 text-xs text-muted-foreground">{RANGE_LIMITS[timeFilter].label}</span>
                  </div>

                  <div className="grid grid-cols-3 gap-1 rounded-md border bg-muted/20 p-1 sm:flex sm:w-auto sm:items-center">
                  <Button
                    type="button"
                    size="sm"
                    variant={timeFilter === "day" ? "default" : "ghost"}
                    onClick={() => handleTimeFilterChange("day")}
                    className="w-full sm:w-auto"
                  >
                    Jour
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant={timeFilter === "month" ? "default" : "ghost"}
                    onClick={() => handleTimeFilterChange("month")}
                    className="w-full sm:w-auto"
                  >
                    Mois
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant={timeFilter === "year" ? "default" : "ghost"}
                    onClick={() => handleTimeFilterChange("year")}
                    className="w-full sm:w-auto"
                  >
                    Annee
                  </Button>
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-3 pt-0 sm:p-4 sm:pt-0">
              <ChartContainer config={chartConfig} className="aspect-auto h-56 w-full">
                <AreaChart
                  accessibilityLayer
                  data={monthlyChartData}
                  margin={{
                    left: 12,
                    right: 12,
                  }}
                >
                  <CartesianGrid vertical={false} />
                  <XAxis
                    dataKey="month"
                    tickLine={false}
                    axisLine={false}
                    tickMargin={8}
                    tickFormatter={(value) => String(value)}
                  />
                  <ChartTooltip
                    cursor={false}
                    content={
                      <ChartTooltipContent
                        indicator="dot"
                        formatter={(value) => `${Number(value).toFixed(2)} Dt`}
                      />
                    }
                  />
                  <Area
                    dataKey="revenue"
                    type="natural"
                    fill="var(--color-revenue)"
                    fillOpacity={0.35}
                    stroke="var(--color-revenue)"
                    stackId="a"
                  />
                  <Area
                    dataKey="net"
                    type="natural"
                    fill="var(--color-net)"
                    fillOpacity={0.35}
                    stroke="var(--color-net)"
                    stackId="a"
                  />
                </AreaChart>
              </ChartContainer>
            </CardContent>
            <CardFooter className="p-3 pt-1 sm:p-4 sm:pt-1">
              <div className="flex w-full items-start gap-2 text-sm">
                <div className="grid gap-2">
                  <div className="flex items-center gap-2 leading-none font-medium">
                    {profitTrendText} <TrendingUp className="size-4" />
                  </div>
                  <div className="flex items-center gap-2 leading-none text-muted-foreground">
                    {profitPoints[0]?.label ?? "-"} - {profitPoints[profitPoints.length - 1]?.label ?? "-"}
                  </div>
                </div>
              </div>
            </CardFooter>
          </Card>

          <div className="rounded-lg border bg-muted/20 p-3">
                <div className="mb-1 flex items-center gap-2 text-sm font-medium">
                  <Banknote className="size-4" />
                  Credit non paye
                </div>
                <p className="text-lg font-semibold">{money(unpaidCredit)}</p>
                <p className="text-xs text-muted-foreground">{unpaidCount} vente(s) en credit</p>

                {unpaidSales.length > 0 && (
                  <div className="mt-3 overflow-x-auto rounded-md border bg-background">
                    <table className="w-full min-w-140 text-sm">
                      <thead className="bg-muted/40 text-muted-foreground">
                        <tr>
                          <th className="px-2 py-1.5 text-left font-medium">Client</th>
                          <th className="px-2 py-1.5 text-left font-medium">Produit</th>
                          <th className="px-2 py-1.5 text-left font-medium">Date vente</th>
                          <th className="px-2 py-1.5 text-left font-medium">Total</th>
                          <th className="px-2 py-1.5 text-left font-medium">Credit reste</th>
                        </tr>
                      </thead>
                      <tbody>
                        {unpaidSales.map((sale) => (
                          <tr key={sale.id} className="border-t">
                            <td className="px-2 py-1.5">
                              <Link
                                href={`/dashboard/ventes?saleId=${sale.id}`}
                                className="text-primary underline-offset-4 hover:underline"
                              >
                                {clientNameById.get(sale.client_id) ?? `Client #${sale.client_id}`}
                              </Link>
                            </td>
                            <td className="px-2 py-1.5">{productNameById.get(sale.product_id) ?? `Produit #${sale.product_id}`}</td>
                            <td className="px-2 py-1.5">{sale.date ? new Date(sale.date).toLocaleDateString() : "-"}</td>
                            <td className="px-2 py-1.5">{money(sale.total ?? ((sale.price ?? 0) * sale.quantity))}</td>
                            <td className="px-2 py-1.5 font-medium text-amber-700">{money(sale.credit ?? 0)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

        </>
      )}
    </section>
  )
}
