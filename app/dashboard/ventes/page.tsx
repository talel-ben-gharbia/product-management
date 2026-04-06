"use client"

import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from "@/components/ui/empty"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { CustomSelect } from "@/components/ui/custom-select"
import { Calendar } from "@/components/ui/calendar"
import type { Database } from "@/lib/database.types"
import { supabase } from "@/lib/supabase"
import { Loader2, Plus, ShoppingCart, ChevronDown, MoreHorizontal, Trash2, CalendarDays, Pencil } from "lucide-react"
import { toast } from "sonner"
import { cn } from "@/lib/utils"

type Vente = Pick<
  Database["public"]["Tables"]["vente"]["Row"],
  "id" | "product_id" | "client_id" | "quantity" | "price" | "total" | "credit" | "date_credit" | "date"
>

type ProductOption = Pick<
  Database["public"]["Tables"]["produit"]["Row"],
  "id" | "name" | "price" | "stock"
>

type ClientOption = Pick<
  Database["public"]["Tables"]["client"]["Row"],
  "id" | "full_name"
>

const ITEMS_PER_PAGE = 10

function toDateInputValue(date: Date) {
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000)
  return local.toISOString().slice(0, 10)
}

function toIsoDateValue(dateValue: string) {
  return new Date(`${dateValue}T12:00:00`).toISOString()
}

function parseCreditInput(value: string) {
  const normalized = value.trim().replace(",", ".")
  if (!normalized) {
    return null
  }

  const parsed = Number(normalized)
  return Number.isNaN(parsed) ? null : parsed
}

function parseMoneyInput(value: string) {
  const normalized = value.trim().replace(",", ".")
  if (!normalized) {
    return null
  }

  const parsed = Number(normalized)
  return Number.isNaN(parsed) ? null : parsed
}

type DateFieldProps = {
  id: string
  label: string
  value: string
  onChange: (value: string) => void
  placeholder: string
}

type NewSaleLine = {
  id: number
  productId: string
  quantity: string
  salePrice: string
  credit: string
  dateCredit: string
}

function createNewSaleLine(id: number): NewSaleLine {
  return {
    id,
    productId: "",
    quantity: "1",
    salePrice: "",
    credit: "",
    dateCredit: "",
  }
}

function DateField({ id, label, value, onChange, placeholder }: DateFieldProps) {
  const [isOpen, setIsOpen] = useState(false)

  const selectedDate = value ? new Date(`${value}T12:00:00`) : undefined

  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <div className="relative">
        {isOpen && (
          <button
            type="button"
            className="fixed inset-0 z-40 bg-black/20 sm:hidden"
            aria-label="Fermer le calendrier"
            onClick={() => setIsOpen(false)}
          />
        )}

        <Button
          id={id}
          type="button"
          variant="outline"
          className="h-9 w-full justify-between rounded-lg font-normal"
          onClick={() => setIsOpen((prev) => !prev)}
          aria-expanded={isOpen}
          aria-haspopup="dialog"
        >
          <span className={value ? "text-foreground" : "text-muted-foreground"}>
            {value ? new Date(`${value}T12:00:00`).toLocaleDateString() : placeholder}
          </span>
          <CalendarDays className="size-4 text-muted-foreground" />
        </Button>

        <div
          className={cn(
            "columns-panel fixed inset-x-3 top-1/2 z-50 mt-0 w-auto -translate-y-1/2 sm:absolute sm:inset-auto sm:left-0 sm:top-full sm:right-auto sm:mt-1 sm:w-auto sm:min-w-full sm:translate-y-0",
            isOpen
              ? "pointer-events-auto scale-100 opacity-100"
              : "pointer-events-none scale-95 opacity-0"
          )}
        >
          <Calendar
            mode="single"
            selected={selectedDate}
            onSelect={(date) => {
              onChange(date ? toDateInputValue(date) : "")
              setIsOpen(false)
            }}
            className="mx-auto"
          />
        </div>
      </div>
    </div>
  )
}

export default function VentesPage() {
  const searchParams = useSearchParams()
  const [ventes, setVentes] = useState<Vente[]>([])
  const [products, setProducts] = useState<ProductOption[]>([])
  const [clients, setClients] = useState<ClientOption[]>([])

  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [newClientId, setNewClientId] = useState("")
  const [newDate, setNewDate] = useState(toDateInputValue(new Date()))
  const [newSaleLines, setNewSaleLines] = useState<NewSaleLine[]>([createNewSaleLine(1)])
  const nextNewSaleLineIdRef = useRef(2)

  const [editingSale, setEditingSale] = useState<Vente | null>(null)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [isUpdating, setIsUpdating] = useState(false)
  const [editProductId, setEditProductId] = useState("")
  const [editClientId, setEditClientId] = useState("")
  const [editQuantity, setEditQuantity] = useState("1")
  const [editSalePrice, setEditSalePrice] = useState("")
  const [editCredit, setEditCredit] = useState("")
  const [editDate, setEditDate] = useState(toDateInputValue(new Date()))
  const [editDateCredit, setEditDateCredit] = useState("")

  const [productOptions, setProductOptions] = useState<ProductOption[]>([])
  const [clientOptions, setClientOptions] = useState<ClientOption[]>([])
  const [productSearch, setProductSearch] = useState("")
  const [clientSearch, setClientSearch] = useState("")
  const [isLoadingProductOptions, setIsLoadingProductOptions] = useState(false)
  const [isLoadingClientOptions, setIsLoadingClientOptions] = useState(false)

  const [searchQuery, setSearchQuery] = useState("")
  const [currentPage, setCurrentPage] = useState(1)
  const [columnsOpen, setColumnsOpen] = useState(false)
  const [visibleColumns, setVisibleColumns] = useState({
    id: true,
    product: true,
    client: true,
    quantity: true,
    price: true,
    total: true,
    credit: true,
    date: true,
    dateCredit: true,
  })

  const [deletingSaleId, setDeletingSaleId] = useState<number | null>(null)
  const [payingCreditSaleId, setPayingCreditSaleId] = useState<number | null>(null)
  const focusedSaleAppliedRef = useRef<number | null>(null)

  const focusedSaleId = useMemo(() => {
    const raw = searchParams.get("saleId")
    if (!raw) {
      return null
    }

    const parsed = Number(raw)
    if (!Number.isInteger(parsed) || parsed <= 0) {
      return null
    }

    return parsed
  }, [searchParams])

  const numericEditCredit = parseCreditInput(editCredit)
  const showEditDateCreditField = numericEditCredit !== null && numericEditCredit > 0

  const hasProducts = products.length > 0
  const hasClients = clients.length > 0

  const productsById = useMemo(() => {
    return new Map(products.map((product) => [product.id, product]))
  }, [products])

  const clientsById = useMemo(() => {
    return new Map(clients.map((client) => [client.id, client]))
  }, [clients])

  const fetchVentes = useCallback(async () => {
    const { data, error: queryError } = await supabase
      .from("vente")
      .select("id, product_id, client_id, quantity, price, total, credit, date_credit, date")
      .order("id", { ascending: true })

    if (queryError) {
      setError(queryError.message)
      setVentes([])
      setIsLoading(false)
      return
    }

    setVentes((data as Vente[]) ?? [])
    setError(null)
    setIsLoading(false)
  }, [])

  const fetchProducts = useCallback(async () => {
    const { data, error: queryError } = await supabase
      .from("produit")
      .select("id, name, price, stock")
      .order("name", { ascending: true })

    if (queryError) {
      toast.error(queryError.message)
      setProducts([])
      return
    }

    setProducts((data as ProductOption[]) ?? [])
  }, [])

  const fetchClients = useCallback(async () => {
    const { data, error: queryError } = await supabase
      .from("client")
      .select("id, full_name")
      .order("full_name", { ascending: true })

    if (queryError) {
      toast.error(queryError.message)
      setClients([])
      return
    }

    setClients((data as ClientOption[]) ?? [])
  }, [])

  const fetchProductOptions = useCallback(async (search = "") => {
    setIsLoadingProductOptions(true)

    let query = supabase
      .from("produit")
      .select("id, name, price, stock")
      .order("name", { ascending: true })
      .limit(10)

    if (search.trim()) {
      query = query.ilike("name", `%${search.trim()}%`)
    }

    const { data, error: queryError } = await query

    if (queryError) {
      setIsLoadingProductOptions(false)
      toast.error(queryError.message)
      setProductOptions([])
      return
    }

    setProductOptions((data as ProductOption[]) ?? [])
    setIsLoadingProductOptions(false)
  }, [])

  const fetchClientOptions = useCallback(async (search = "") => {
    setIsLoadingClientOptions(true)

    let query = supabase
      .from("client")
      .select("id, full_name")
      .order("full_name", { ascending: true })
      .limit(10)

    if (search.trim()) {
      query = query.ilike("full_name", `%${search.trim()}%`)
    }

    const { data, error: queryError } = await query

    if (queryError) {
      setIsLoadingClientOptions(false)
      toast.error(queryError.message)
      setClientOptions([])
      return
    }

    setClientOptions((data as ClientOption[]) ?? [])
    setIsLoadingClientOptions(false)
  }, [])

  useEffect(() => {
    let isMounted = true
    const fetchTimer = window.setTimeout(() => {
      Promise.all([fetchVentes(), fetchProducts(), fetchClients()]).catch(() => {
        if (isMounted) {
          setError("Impossible de charger les ventes")
          setIsLoading(false)
        }
      })
    }, 0)

    return () => {
      isMounted = false
      window.clearTimeout(fetchTimer)
    }
  }, [fetchVentes, fetchProducts, fetchClients])

  useEffect(() => {
    if (!isDialogOpen) {
      return
    }

    const timer = window.setTimeout(() => {
      void fetchProductOptions(productSearch)
    }, 200)

    return () => window.clearTimeout(timer)
  }, [isDialogOpen, productSearch, fetchProductOptions])

  useEffect(() => {
    if (!isDialogOpen) {
      return
    }

    const timer = window.setTimeout(() => {
      void fetchClientOptions(clientSearch)
    }, 200)

    return () => window.clearTimeout(timer)
  }, [isDialogOpen, clientSearch, fetchClientOptions])

  useEffect(() => {
    if (!focusedSaleId || ventes.length === 0) {
      return
    }

    if (focusedSaleAppliedRef.current === focusedSaleId) {
      return
    }

    const saleIndex = ventes.findIndex((sale) => sale.id === focusedSaleId)
    if (saleIndex < 0) {
      return
    }

    const page = Math.floor(saleIndex / ITEMS_PER_PAGE) + 1
    focusedSaleAppliedRef.current = focusedSaleId

    window.setTimeout(() => {
      setCurrentPage(page)
      document.getElementById(`sale-row-${focusedSaleId}`)?.scrollIntoView({
        behavior: "smooth",
        block: "center",
      })
    }, 80)
  }, [focusedSaleId, ventes])

  const handleLineProductChange = (lineId: number, value: string) => {
    const selectedProductId = Number(value)
    const productCost = productOptions.find((item) => item.id === selectedProductId)?.price
      ?? productsById.get(selectedProductId)?.price

    setNewSaleLines((prev) => prev.map((line) => {
      if (line.id !== lineId) {
        return line
      }

      return {
        ...line,
        productId: value,
        salePrice: productCost !== null && productCost !== undefined ? String(productCost) : "",
      }
    }))
  }

  const handleLineChange = (lineId: number, field: keyof Omit<NewSaleLine, "id">, value: string) => {
    setNewSaleLines((prev) => prev.map((line) => (
      line.id === lineId
        ? {
          ...line,
          [field]: value,
        }
        : line
    )))
  }

  const handleAddSaleLine = () => {
    setNewSaleLines((prev) => [...prev, createNewSaleLine(nextNewSaleLineIdRef.current++)])
  }

  const handleRemoveSaleLine = (lineId: number) => {
    setNewSaleLines((prev) => {
      if (prev.length <= 1) {
        return prev
      }

      return prev.filter((line) => line.id !== lineId)
    })
  }

  async function handleAddVente(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (!newClientId) {
      toast.error("Selectionnez un client")
      return
    }

    if (newSaleLines.length === 0) {
      toast.error("Ajoutez au moins un produit")
      return
    }

    const parsedLines: Array<{
      productId: number
      quantity: number
      salePrice: number
      credit: number | null
      effectiveDateCredit: string
    }> = []

    for (let index = 0; index < newSaleLines.length; index += 1) {
      const line = newSaleLines[index]
      const lineNumber = index + 1

      if (!line.productId) {
        toast.error(`Ligne ${lineNumber}: selectionnez un produit`)
        return
      }

      const parsedQuantity = Number(line.quantity)
      if (!Number.isInteger(parsedQuantity) || parsedQuantity <= 0) {
        toast.error(`Ligne ${lineNumber}: la quantite doit etre un entier superieur a 0`)
        return
      }

      const parsedCredit = parseCreditInput(line.credit)
      if (line.credit.trim() !== "" && parsedCredit === null) {
        toast.error(`Ligne ${lineNumber}: le credit doit etre un nombre valide`)
        return
      }

      if (parsedCredit !== null && parsedCredit < 0) {
        toast.error(`Ligne ${lineNumber}: le credit doit etre superieur ou egal a 0`)
        return
      }

      const parsedSalePrice = parseMoneyInput(line.salePrice)
      if (parsedSalePrice === null || parsedSalePrice < 0) {
        toast.error(`Ligne ${lineNumber}: le prix de vente doit etre un nombre valide superieur ou egal a 0`)
        return
      }

      const effectiveDateCredit = parsedCredit !== null && parsedCredit > 0
        ? (line.dateCredit || newDate)
        : ""

      parsedLines.push({
        productId: Number(line.productId),
        quantity: parsedQuantity,
        salePrice: parsedSalePrice,
        credit: parsedCredit,
        effectiveDateCredit,
      })
    }

    const clientId = Number(newClientId)

    const uniqueProductIds = Array.from(new Set(parsedLines.map((line) => line.productId)))
    const { data: productRows, error: productError } = await supabase
      .from("produit")
      .select("id, stock")
      .in("id", uniqueProductIds)

    if (productError) {
      toast.error(productError?.message || "Produit introuvable")
      return
    }

    const stockByProductId = new Map((productRows ?? []).map((product) => [product.id, product.stock ?? 0]))
    const requiredByProductId = new Map<number, number>()

    for (const line of parsedLines) {
      requiredByProductId.set(
        line.productId,
        (requiredByProductId.get(line.productId) ?? 0) + line.quantity
      )
    }

    for (const [productId, neededQuantity] of requiredByProductId.entries()) {
      const availableStock = stockByProductId.get(productId)
      if (availableStock === undefined) {
        toast.error("Un produit selectionne est introuvable")
        return
      }

      if (availableStock < neededQuantity) {
        const productName = productsById.get(productId)?.name ?? `#${productId}`
        toast.error(`Stock insuffisant pour ${productName}. Disponible: ${availableStock}`)
        return
      }
    }

    setIsSubmitting(true)
    const { data: insertedSales, error: insertError } = await supabase
      .from("vente")
      .insert(parsedLines.map((line) => ({
        product_id: line.productId,
        client_id: clientId,
        quantity: line.quantity,
        price: line.salePrice,
        total: line.salePrice * line.quantity,
        credit: line.credit,
        date: newDate ? toIsoDateValue(newDate) : null,
        date_credit: line.effectiveDateCredit ? toIsoDateValue(line.effectiveDateCredit) : null,
      })))
      .select("id")

    if (insertError) {
      setIsSubmitting(false)
      toast.error(insertError.message)
      return
    }

    const updatedProducts: number[] = []
    let hasStockUpdateError = false

    for (const [productId, neededQuantity] of requiredByProductId.entries()) {
      const availableStock = stockByProductId.get(productId)
      if (availableStock === undefined) {
        hasStockUpdateError = true
        break
      }

      const { error: stockUpdateError } = await supabase
        .from("produit")
        .update({ stock: availableStock - neededQuantity })
        .eq("id", productId)

      if (stockUpdateError) {
        hasStockUpdateError = true
        break
      }

      updatedProducts.push(productId)
    }

    if (hasStockUpdateError) {
      for (const productId of updatedProducts) {
        const initialStock = stockByProductId.get(productId)
        if (initialStock !== undefined) {
          await supabase
            .from("produit")
            .update({ stock: initialStock })
            .eq("id", productId)
        }
      }

      const insertedSaleIds = (insertedSales ?? []).map((sale) => sale.id)
      if (insertedSaleIds.length > 0) {
        await supabase.from("vente").delete().in("id", insertedSaleIds)
      }

      setIsSubmitting(false)
      toast.error("Erreur lors de la mise a jour du stock")
      return
    }

    setIsSubmitting(false)
    toast.success(`${parsedLines.length} vente(s) ajoutee(s)`)
    setNewClientId("")
    setNewDate(toDateInputValue(new Date()))
    setNewSaleLines([createNewSaleLine(nextNewSaleLineIdRef.current++)])
    setIsDialogOpen(false)
    setIsLoading(true)
    await Promise.all([fetchVentes(), fetchProducts()])
  }

  async function handleDeleteVente(venteId: number) {
    const sale = ventes.find((item) => item.id === venteId)
    if (!sale) {
      return
    }

    setDeletingSaleId(venteId)

    const { error: deleteError } = await supabase
      .from("vente")
      .delete()
      .eq("id", venteId)

    if (deleteError) {
      setDeletingSaleId(null)
      toast.error(deleteError.message)
      return
    }

    const currentStock = productsById.get(sale.product_id)?.stock ?? 0
    const { error: restoreStockError } = await supabase
      .from("produit")
      .update({ stock: currentStock + sale.quantity })
      .eq("id", sale.product_id)

    setDeletingSaleId(null)

    if (restoreStockError) {
      toast.error("Vente supprimee, mais le stock n'a pas pu etre restaure automatiquement")
      setIsLoading(true)
      await Promise.all([fetchVentes(), fetchProducts()])
      return
    }

    toast.success("Vente supprimee")
    setIsLoading(true)
    await Promise.all([fetchVentes(), fetchProducts()])
  }

  function openEditVenteDialog(sale: Vente) {
    setEditingSale(sale)
    setEditProductId(String(sale.product_id))
    setEditClientId(String(sale.client_id))
    setEditQuantity(String(sale.quantity))
    setEditSalePrice(sale.price !== null ? String(sale.price) : "")
    setEditCredit(sale.credit !== null ? String(sale.credit) : "")
    setEditDate(sale.date ? toDateInputValue(new Date(sale.date)) : toDateInputValue(new Date()))
    setEditDateCredit(sale.date_credit ? toDateInputValue(new Date(sale.date_credit)) : "")
    setIsEditDialogOpen(true)
  }

  async function handleUpdateVente(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (!editingSale) {
      return
    }

    if (!editProductId || !editClientId) {
      toast.error("Selectionnez un produit et un client")
      return
    }

    const parsedQuantity = Number(editQuantity)
    if (!Number.isInteger(parsedQuantity) || parsedQuantity <= 0) {
      toast.error("La quantite doit etre un entier superieur a 0")
      return
    }

    const parsedCredit = parseCreditInput(editCredit)
    if (editCredit.trim() !== "" && parsedCredit === null) {
      toast.error("Le credit doit etre un nombre valide")
      return
    }

    if (parsedCredit !== null && parsedCredit < 0) {
      toast.error("Le credit doit etre superieur ou egal a 0")
      return
    }

    const parsedSalePrice = parseMoneyInput(editSalePrice)
    if (parsedSalePrice === null || parsedSalePrice < 0) {
      toast.error("Le prix de vente doit etre un nombre valide superieur ou egal a 0")
      return
    }

    const nextProductId = Number(editProductId)
    const nextClientId = Number(editClientId)
    const previousProductId = editingSale.product_id
    const previousQuantity = editingSale.quantity
    const saleTotal = parsedSalePrice * parsedQuantity
    const effectiveDateCredit = parsedCredit !== null && parsedCredit > 0
      ? (editDateCredit || editDate)
      : ""

    setIsUpdating(true)

    const { data: stockRows, error: stockError } = await supabase
      .from("produit")
      .select("id, stock")
      .in("id", Array.from(new Set([previousProductId, nextProductId])))

    if (stockError) {
      setIsUpdating(false)
      toast.error(stockError.message)
      return
    }

    const stockById = new Map((stockRows ?? []).map((item) => [item.id, item.stock ?? 0]))
    const previousStock = stockById.get(previousProductId)
    const nextStock = stockById.get(nextProductId)

    if (previousStock === undefined || nextStock === undefined) {
      setIsUpdating(false)
      toast.error("Produit introuvable")
      return
    }

    if (previousProductId === nextProductId) {
      const availableAfterRestore = previousStock + previousQuantity
      if (availableAfterRestore < parsedQuantity) {
        setIsUpdating(false)
        toast.error(`Stock insuffisant. Disponible: ${availableAfterRestore}`)
        return
      }

      const { error: updateStockError } = await supabase
        .from("produit")
        .update({ stock: availableAfterRestore - parsedQuantity })
        .eq("id", previousProductId)

      if (updateStockError) {
        setIsUpdating(false)
        toast.error("Erreur lors de la mise a jour du stock")
        return
      }
    } else {
      if (nextStock < parsedQuantity) {
        setIsUpdating(false)
        toast.error(`Stock insuffisant. Disponible: ${nextStock}`)
        return
      }

      const { error: restorePreviousStockError } = await supabase
        .from("produit")
        .update({ stock: previousStock + previousQuantity })
        .eq("id", previousProductId)

      if (restorePreviousStockError) {
        setIsUpdating(false)
        toast.error("Erreur lors de la mise a jour du stock")
        return
      }

      const { error: deductNextStockError } = await supabase
        .from("produit")
        .update({ stock: nextStock - parsedQuantity })
        .eq("id", nextProductId)

      if (deductNextStockError) {
        await supabase
          .from("produit")
          .update({ stock: previousStock })
          .eq("id", previousProductId)
        setIsUpdating(false)
        toast.error("Erreur lors de la mise a jour du stock")
        return
      }
    }

    const { error: updateSaleError } = await supabase
      .from("vente")
      .update({
        product_id: nextProductId,
        client_id: nextClientId,
        quantity: parsedQuantity,
        price: parsedSalePrice,
        total: saleTotal,
        credit: parsedCredit,
        date: editDate ? toIsoDateValue(editDate) : null,
        date_credit: effectiveDateCredit ? toIsoDateValue(effectiveDateCredit) : null,
      })
      .eq("id", editingSale.id)

    if (updateSaleError) {
      if (previousProductId === nextProductId) {
        await supabase
          .from("produit")
          .update({ stock: previousStock })
          .eq("id", previousProductId)
      } else {
        await supabase
          .from("produit")
          .update({ stock: previousStock })
          .eq("id", previousProductId)
        await supabase
          .from("produit")
          .update({ stock: nextStock })
          .eq("id", nextProductId)
      }

      setIsUpdating(false)
      toast.error(updateSaleError.message)
      return
    }

    setIsUpdating(false)
    setIsEditDialogOpen(false)
    setEditingSale(null)
    toast.success("Vente modifiee")
    setIsLoading(true)
    await Promise.all([fetchVentes(), fetchProducts()])
  }

  async function handlePayCredit(venteId: number) {
    setPayingCreditSaleId(venteId)

    const { error: updateError } = await supabase
      .from("vente")
      .update({ credit: 0 })
      .eq("id", venteId)

    setPayingCreditSaleId(null)

    if (updateError) {
      toast.error(updateError.message)
      return
    }

    toast.success("Credit paye")
    setIsLoading(true)
    await fetchVentes()
  }

  const filteredVentes = ventes.filter((sale) => {
    const term = searchQuery.toLowerCase()
    const productName = productsById.get(sale.product_id)?.name.toLowerCase() ?? ""
    const clientName = clientsById.get(sale.client_id)?.full_name.toLowerCase() ?? ""
    return productName.includes(term) || clientName.includes(term)
  })

  const totalPages = Math.max(1, Math.ceil(filteredVentes.length / ITEMS_PER_PAGE))
  const paginatedVentes = filteredVentes.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  )

  const handleSearch = (value: string) => {
    setSearchQuery(value)
    setCurrentPage(1)
  }

  return (
    <section className="app-page app-page-ventes space-y-4 rounded-xl p-3 sm:p-4 md:p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
        <div className="flex items-start gap-3">
          <div className="app-page-icon app-page-icon-ventes">
            <ShoppingCart className="size-4" />
          </div>
          <div>
            <h2 className="app-page-title-ventes text-xl font-semibold">Ventes</h2>
          </div>
        </div>

        <Dialog
          open={isDialogOpen}
          onOpenChange={(open) => {
            if (open && !hasProducts) {
              toast.error("Ajoutez d'abord un produit avant une vente")
              return
            }
            if (open && !hasClients) {
              toast.error("Ajoutez d'abord un client avant une vente")
              return
            }

            if (open) {
              setProductSearch("")
              setClientSearch("")
            }

            setIsDialogOpen(open)
          }}
        >
          <DialogTrigger asChild>
            <Button className="w-full px-4 sm:w-auto">
              <Plus className="size-4" />
              Ajouter vente
            </Button>
          </DialogTrigger>
          <DialogContent className="app-dialog-content app-dialog-ventes sm:max-w-xl">
            <DialogHeader>
              <DialogTitle>Nouvelle vente</DialogTitle>
              <DialogDescription>
                Selectionnez un client puis ajoutez plusieurs produits avec le bouton +.
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleAddVente} className="space-y-4">
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="sale-client">Client</Label>
                  <CustomSelect
                    id="sale-client"
                    value={newClientId}
                    onChange={setNewClientId}
                    placeholder="Choisir un client"
                    searchable
                    searchValue={clientSearch}
                    onSearchChange={setClientSearch}
                    searchPlaceholder="Rechercher un client..."
                    isLoading={isLoadingClientOptions}
                    emptyText="Aucun client"
                    onOpenChange={(open) => {
                      if (open) {
                        void fetchClientOptions(clientSearch)
                      }
                    }}
                    options={clientOptions.map((client) => ({
                      value: String(client.id),
                      label: client.full_name,
                    }))}
                  />
                </div>
                <DateField
                  id="sale-date"
                  label="Date de vente"
                  value={newDate}
                  onChange={setNewDate}
                  placeholder="Choisir une date"
                />
              </div>

              <div className="space-y-3">
                <div className="max-h-90 space-y-3 overflow-y-auto pr-1">
                  {newSaleLines.map((line, index) => {
                    const selectedProductId = Number(line.productId)
                    const selectedProduct = Number.isNaN(selectedProductId)
                      ? null
                      : (productOptions.find((item) => item.id === selectedProductId)
                        ?? productsById.get(selectedProductId)
                        ?? null)
                    const lineCredit = parseCreditInput(line.credit)
                    const showLineDateCreditField = lineCredit !== null && lineCredit > 0

                    return (
                      <div key={line.id} className="space-y-3 rounded-lg border p-3">
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-medium">Produit {index + 1}</p>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon-sm"
                            onClick={() => handleRemoveSaleLine(line.id)}
                            disabled={newSaleLines.length === 1}
                            className="text-destructive hover:text-destructive"
                          >
                            <Trash2 className="size-4" />
                            <span className="sr-only">Supprimer la ligne</span>
                          </Button>
                        </div>

                        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                          <div className="space-y-2">
                            <Label htmlFor={`sale-product-${line.id}`}>Produit</Label>
                            <CustomSelect
                              id={`sale-product-${line.id}`}
                              value={line.productId}
                              onChange={(value) => handleLineProductChange(line.id, value)}
                              placeholder="Choisir un produit"
                              searchable
                              searchValue={productSearch}
                              onSearchChange={setProductSearch}
                              searchPlaceholder="Rechercher un produit..."
                              isLoading={isLoadingProductOptions}
                              emptyText="Aucun produit"
                              onOpenChange={(open) => {
                                if (open) {
                                  void fetchProductOptions(productSearch)
                                }
                              }}
                              options={productOptions.map((product) => ({
                                value: String(product.id),
                                label: `${product.name} (stock: ${product.stock ?? 0})`,
                              }))}
                            />
                          </div>

                          <div className="space-y-2">
                            <Label htmlFor={`sale-quantity-${line.id}`}>Quantite</Label>
                            <Input
                              id={`sale-quantity-${line.id}`}
                              type="number"
                              min="1"
                              step="1"
                              value={line.quantity}
                              onChange={(event) => handleLineChange(line.id, "quantity", event.target.value)}
                              placeholder="1"
                              inputMode="numeric"
                              className="h-9 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                              required
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                          <div className="space-y-2">
                            <Label htmlFor={`sale-price-${line.id}`}>Prix vente</Label>
                            <Input
                              id={`sale-price-${line.id}`}
                              type="number"
                              min="0"
                              step="0.01"
                              value={line.salePrice}
                              onChange={(event) => handleLineChange(line.id, "salePrice", event.target.value)}
                              placeholder="0.00"
                              inputMode="decimal"
                              className="h-9 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                              required
                            />
                          </div>

                          <div className="space-y-2">
                            <Label htmlFor={`sale-credit-${line.id}`}>Credit</Label>
                            <Input
                              id={`sale-credit-${line.id}`}
                              type="number"
                              min="0"
                              step="0.01"
                              value={line.credit}
                              onChange={(event) => handleLineChange(line.id, "credit", event.target.value)}
                              placeholder="0.00"
                              inputMode="decimal"
                              className="h-9 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                          {showLineDateCreditField ? (
                            <DateField
                              id={`sale-date-credit-${line.id}`}
                              label="Date credit"
                              value={line.dateCredit}
                              onChange={(value) => handleLineChange(line.id, "dateCredit", value)}
                              placeholder="Choisir une date"
                            />
                          ) : (
                            <div className="space-y-2">
                              <Label>Date credit</Label>
                              <div className="flex h-9 items-center rounded-lg border border-dashed border-input px-3 text-sm text-muted-foreground">
                                Non requis si credit = 0
                              </div>
                            </div>
                          )}
                        </div>

                        {selectedProduct && (
                          <div className="rounded-lg border bg-muted/30 px-3 py-2 text-sm">
                            <div>
                              Stock disponible: <strong>{selectedProduct.stock ?? 0}</strong>
                            </div>
                            <div>
                              Cout unitaire: <strong>{(selectedProduct.price ?? 0).toFixed(2)} Dt</strong>
                            </div>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>

                <Button
                  type="button"
                  variant="outline"
                  className="w-full"
                  onClick={handleAddSaleLine}
                >
                  <Plus className="size-4" />
                  Ajouter un autre produit
                </Button>
              </div>

              <DialogFooter>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? "Ajout..." : "Ajouter"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading && (
        <div className="flex items-center gap-2 rounded-lg border bg-muted/30 px-3 py-2 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" />
          Chargement des ventes...
        </div>
      )}

      {!isLoading && error && <p className="text-sm text-destructive">Erreur: {error}</p>}

      {!isLoading && !error && ventes.length === 0 && (
        <Empty className="border">
          <EmptyHeader>
            <EmptyTitle>Aucune vente</EmptyTitle>
            <EmptyDescription>Commencez par ajouter une vente.</EmptyDescription>
          </EmptyHeader>
        </Empty>
      )}

      {!isLoading && !error && ventes.length > 0 && (
        <>
          <div className="flex items-center justify-between gap-3">
            <Input
              placeholder="Rechercher une vente..."
              value={searchQuery}
              onChange={(event) => handleSearch(event.target.value)}
              className="flex-1 border rounded-lg px-4 py-2 text-sm"
            />
            <div className="relative">
              <Button
                variant="outline"
                size="sm"
                className="gap-2 transition-colors"
                onClick={() => setColumnsOpen(!columnsOpen)}
              >
                Colonnes
                <ChevronDown className={`size-4 transition-transform duration-200 ${columnsOpen ? "rotate-180" : "rotate-0"}`} />
              </Button>
              <div
                className={`columns-panel w-52 ${
                  columnsOpen
                    ? "pointer-events-auto translate-y-0 scale-100 opacity-100"
                    : "pointer-events-none -translate-y-1 scale-95 opacity-0"
                }`}
              >
                  <div className="p-2 space-y-2">
                    {[
                      { key: "id", label: "ID" },
                      { key: "product", label: "Produit" },
                      { key: "client", label: "Client" },
                      { key: "quantity", label: "Quantite" },
                      { key: "dateCredit", label: "Date credit" },
                      { key: "total", label: "Total" },
                      { key: "credit", label: "Credit" },
                      { key: "date", label: "Date" },
                    ].map((col) => (
                      <label key={col.key} className="flex items-center gap-2 cursor-pointer p-2 hover:bg-muted rounded">
                        <input
                          type="checkbox"
                          checked={visibleColumns[col.key as keyof typeof visibleColumns]}
                          onChange={() =>
                            setVisibleColumns((prev) => ({
                              ...prev,
                              [col.key]: !prev[col.key as keyof typeof prev],
                            }))
                          }
                        />
                        <span className="text-sm">{col.label}</span>
                      </label>
                    ))}
                  </div>
                </div>
            </div>
          </div>

          {filteredVentes.length === 0 ? (
            <Empty className="border">
              <EmptyHeader>
                <EmptyTitle>Aucun resultat</EmptyTitle>
                <EmptyDescription>Aucune vente ne correspond a votre recherche.</EmptyDescription>
              </EmptyHeader>
            </Empty>
          ) : (
            <>
              <div className="app-table-wrap">
                <Table>
                  <TableHeader>
                    <TableRow className="app-table-head-row app-table-head-row-ventes">
                      {visibleColumns.id && <TableHead>ID</TableHead>}
                      {visibleColumns.product && <TableHead>Produit</TableHead>}
                      {visibleColumns.client && <TableHead>Client</TableHead>}
                      {visibleColumns.quantity && <TableHead>Quantite</TableHead>}
                      {visibleColumns.price && <TableHead>Prix vente</TableHead>}
                      {visibleColumns.total && <TableHead>Total</TableHead>}
                      {visibleColumns.credit && <TableHead>Credit</TableHead>}
                      {visibleColumns.date && <TableHead>Date</TableHead>}
                      {visibleColumns.dateCredit && <TableHead>Date credit</TableHead>}
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedVentes.map((sale) => (
                      <TableRow
                        key={sale.id}
                        id={`sale-row-${sale.id}`}
                        className={cn(
                          "app-table-row app-table-row-ventes",
                          focusedSaleId === sale.id && "bg-amber-100/60 ring-1 ring-amber-300"
                        )}
                      >
                        {visibleColumns.id && <TableCell>{sale.id}</TableCell>}
                        {visibleColumns.product && (
                          <TableCell>{productsById.get(sale.product_id)?.name ?? `#${sale.product_id}`}</TableCell>
                        )}
                        {visibleColumns.client && (
                          <TableCell>
                            <Link
                              href={`/dashboard/clients/${sale.client_id}`}
                              className="text-primary underline-offset-4 hover:underline"
                            >
                              {clientsById.get(sale.client_id)?.full_name ?? `#${sale.client_id}`}
                            </Link>
                          </TableCell>
                        )}
                        {visibleColumns.quantity && (
                          <TableCell>
                            <Badge variant="outline">{sale.quantity}</Badge>
                          </TableCell>
                        )}
                        {visibleColumns.price && (
                          <TableCell>{sale.price !== null ? `${sale.price.toFixed(2)} Dt` : "-"}</TableCell>
                        )}
                        {visibleColumns.total && (
                          <TableCell>{sale.total !== null ? `${sale.total.toFixed(2)} Dt` : "-"}</TableCell>
                        )}
                        {visibleColumns.credit && (
                          <TableCell>{sale.credit !== null ? `${sale.credit.toFixed(2)} Dt` : "-"}</TableCell>
                        )}
                        {visibleColumns.date && (
                          <TableCell>{sale.date ? new Date(sale.date).toLocaleString() : "-"}</TableCell>
                        )}
                        {visibleColumns.dateCredit && (
                          <TableCell>
                            {sale.date_credit
                              ? new Date(sale.date_credit).toLocaleString()
                              : sale.credit !== null && sale.credit > 0 && sale.date
                                ? new Date(sale.date).toLocaleString()
                                : "-"}
                          </TableCell>
                        )}
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            {sale.credit !== null && sale.credit > 0 && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handlePayCredit(sale.id)}
                                disabled={payingCreditSaleId === sale.id}
                              >
                                {payingCreditSaleId === sale.id ? "..." : "Credit paye"}
                              </Button>
                            )}
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              onClick={() => openEditVenteDialog(sale)}
                            >
                              <Pencil className="size-4" />
                              <span className="sr-only">Edit</span>
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              onClick={() => setDeletingSaleId(sale.id)}
                              className="text-destructive hover:text-destructive"
                            >
                              <Trash2 className="size-4" />
                              <span className="sr-only">Delete</span>
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              <div className="flex items-center justify-between pt-4">
                <span className="text-sm text-muted-foreground">{filteredVentes.length} element(s)</span>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                    disabled={currentPage === 1}
                  >
                    Precedent
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
                    disabled={currentPage === totalPages}
                  >
                    Suivant
                  </Button>
                </div>
              </div>

              {deletingSaleId && (
                <AlertDialog open={true}>
                  <AlertDialogContent size="sm" className="app-alert-content app-alert-ventes">
                    <AlertDialogHeader>
                      <div className="mb-2 inline-flex size-10 items-center justify-center rounded-md bg-destructive/10 text-destructive">
                        <MoreHorizontal className="size-5" />
                      </div>
                      <AlertDialogTitle>Supprimer la vente ?</AlertDialogTitle>
                      <AlertDialogDescription>
                        Cette action est irreversible et le stock sera restaure.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel onClick={() => setDeletingSaleId(null)}>Annuler</AlertDialogCancel>
                      <AlertDialogAction
                        variant="destructive"
                        onClick={() => handleDeleteVente(deletingSaleId)}
                      >
                        Supprimer
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              )}
            </>
          )}
        </>
      )}

      <Dialog
        open={isEditDialogOpen}
        onOpenChange={(open) => {
          setIsEditDialogOpen(open)
          if (!open) {
            setEditingSale(null)
          }
        }}
      >
        <DialogContent className="app-dialog-content app-dialog-ventes sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>Modifier vente</DialogTitle>
            <DialogDescription>Modifiez les informations de la vente.</DialogDescription>
          </DialogHeader>

          <form onSubmit={handleUpdateVente} className="space-y-4">
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="sale-edit-product">Produit</Label>
                <CustomSelect
                  id="sale-edit-product"
                  value={editProductId}
                  onChange={setEditProductId}
                  placeholder="Choisir un produit"
                  options={products.map((product) => ({
                    value: String(product.id),
                    label: `${product.name} (stock: ${product.stock ?? 0})`,
                  }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="sale-edit-client">Client</Label>
                <CustomSelect
                  id="sale-edit-client"
                  value={editClientId}
                  onChange={setEditClientId}
                  placeholder="Choisir un client"
                  options={clients.map((client) => ({
                    value: String(client.id),
                    label: client.full_name,
                  }))}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="sale-edit-quantity">Quantite</Label>
                <Input
                  id="sale-edit-quantity"
                  type="number"
                  min="1"
                  step="1"
                  value={editQuantity}
                  onChange={(event) => setEditQuantity(event.target.value)}
                  inputMode="numeric"
                  className="h-9 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="sale-edit-price">Prix vente</Label>
                <Input
                  id="sale-edit-price"
                  type="number"
                  min="0"
                  step="0.01"
                  value={editSalePrice}
                  onChange={(event) => setEditSalePrice(event.target.value)}
                  inputMode="decimal"
                  className="h-9 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="sale-edit-credit">Credit</Label>
                <Input
                  id="sale-edit-credit"
                  type="number"
                  min="0"
                  step="0.01"
                  value={editCredit}
                  onChange={(event) => setEditCredit(event.target.value)}
                  inputMode="decimal"
                  className="h-9 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <DateField
                id="sale-edit-date"
                label="Date de vente"
                value={editDate}
                onChange={setEditDate}
                placeholder="Choisir une date"
              />
              {showEditDateCreditField ? (
                <DateField
                  id="sale-edit-date-credit"
                  label="Date credit"
                  value={editDateCredit}
                  onChange={setEditDateCredit}
                  placeholder="Choisir une date"
                />
              ) : (
                <div className="space-y-2">
                  <Label>Date credit</Label>
                  <div className="flex h-9 items-center rounded-lg border border-dashed border-input px-3 text-sm text-muted-foreground">
                    Non requis si credit = 0
                  </div>
                </div>
              )}
            </div>

            <DialogFooter>
              <Button type="submit" disabled={isUpdating}>
                {isUpdating ? "Mise a jour..." : "Enregistrer"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </section>
  )
}
