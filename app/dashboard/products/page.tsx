"use client"

import { FormEvent, useCallback, useEffect, useState } from "react"
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
  AlertDialogTrigger,
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
import { Textarea } from "@/components/ui/textarea"
import type { Database } from "@/lib/database.types"
import { supabase } from "@/lib/supabase"
import { Loader2, Package, Plus, ChevronDown, MoreHorizontal, Pencil, Trash2 } from "lucide-react"
import { toast } from "sonner"

type Product = Pick<
  Database["public"]["Tables"]["produit"]["Row"],
  "id" | "name" | "price" | "description" | "stock" | "categorie_id" | "user_id"
> & {
  categorie: { name: string } | null
}

type CategoryOption = Pick<
  Database["public"]["Tables"]["categorie"]["Row"],
  "id" | "name"
>

const ITEMS_PER_PAGE = 10

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [categories, setCategories] = useState<CategoryOption[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [newName, setNewName] = useState("")
  const [newPrice, setNewPrice] = useState("")
  const [newStock, setNewStock] = useState("")
  const [newDescription, setNewDescription] = useState("")
  const [newCategoryId, setNewCategoryId] = useState("")
  const [editingProduct, setEditingProduct] = useState<Product | null>(null)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [editName, setEditName] = useState("")
  const [editPrice, setEditPrice] = useState("")
  const [editStock, setEditStock] = useState("")
  const [editDescription, setEditDescription] = useState("")
  const [editCategoryId, setEditCategoryId] = useState("")
  const [isUpdating, setIsUpdating] = useState(false)
  const [deletingProductId, setDeletingProductId] = useState<number | null>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [currentPage, setCurrentPage] = useState(1)
  const [selectedProducts, setSelectedProducts] = useState<number[]>([])
  const [visibleColumns, setVisibleColumns] = useState({
    id: true,
    name: true,
    categorie: true,
    price: true,
    stock: true,
  })
  const [columnsOpen, setColumnsOpen] = useState(false)

  const hasCategories = categories.length > 0

  const toggleRowSelection = (productId: number) => {
    setSelectedProducts((prev) =>
      prev.includes(productId)
        ? prev.filter((id) => id !== productId)
        : [...prev, productId]
    )
  }

  const toggleAllRowsSelection = () => {
    if (selectedProducts.length === paginatedProducts.length) {
      setSelectedProducts([])
    } else {
      setSelectedProducts(paginatedProducts.map((p) => p.id))
    }
  }

  const toggleColumnVisibility = (column: string) => {
    setVisibleColumns((prev) => ({
      ...prev,
      [column]: !prev[column as keyof typeof prev],
    }))
  }

  const getCurrentUserId = useCallback(async () => {
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return null
    }

    return user.id
  }, [])

  const fetchProducts = useCallback(async () => {
    const userId = await getCurrentUserId()

    if (!userId) {
      setError("Session invalide. Reconnectez-vous.")
      setProducts([])
      setIsLoading(false)
      return
    }

    const { data, error: queryError } = await supabase
      .from("produit")
      .select("id, name, price, description, stock, categorie:categorie!produit_categorie_id_fkey(name)")
      .eq("user_id", userId)
      .order("id", { ascending: true })

    if (queryError) {
      setError(queryError.message)
      setProducts([])
      setIsLoading(false)
      return
    }

    setProducts((data as Product[]) ?? [])
    setError(null)
    setIsLoading(false)
  }, [getCurrentUserId])

  const fetchCategories = useCallback(async () => {
    const userId = await getCurrentUserId()

    if (!userId) {
      setCategories([])
      return
    }

    const { data, error: queryError } = await supabase
      .from("categorie")
      .select("id, name")
      .eq("user_id", userId)
      .order("name", { ascending: true })

    if (queryError) {
      toast.error(queryError.message)
      setCategories([])
      return
    }

    setCategories((data as CategoryOption[]) ?? [])
  }, [getCurrentUserId])

  useEffect(() => {
    let isMounted = true
    const fetchTimer = window.setTimeout(() => {
      Promise.all([fetchProducts(), fetchCategories()]).catch(() => {
        if (isMounted) {
          setError("Impossible de charger les produits")
          setIsLoading(false)
        }
      })
    }, 0)

    return () => {
      isMounted = false
      window.clearTimeout(fetchTimer)
    }
  }, [fetchCategories, fetchProducts])

  async function handleAddProduct(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (!newCategoryId) {
      toast.error("Selectionnez une categorie")
      return
    }

    const userId = await getCurrentUserId()
    if (!userId) {
      toast.error("Session invalide. Reconnectez-vous.")
      return
    }

    setIsSubmitting(true)
    const { error: insertError } = await supabase.from("produit").insert({
      name: newName.trim(),
      price: newPrice ? Number(newPrice) : null,
      stock: newStock ? Number(newStock) : null,
      description: newDescription.trim() || null,
      categorie_id: Number(newCategoryId),
      user_id: userId,
    })
    setIsSubmitting(false)

    if (insertError) {
      toast.error(insertError.message)
      return
    }

    toast.success("Produit ajoute")
    setNewName("")
    setNewPrice("")
    setNewStock("")
    setNewDescription("")
    setNewCategoryId("")
    setIsDialogOpen(false)
    setIsLoading(true)
    await fetchProducts()
  }

  function openEditProductDialog(product: Product) {
    setEditingProduct(product)
    setEditName(product.name)
    setEditPrice(product.price?.toString() ?? "")
    setEditStock(product.stock?.toString() ?? "")
    setEditDescription(product.description ?? "")
    setEditCategoryId(product.categorie_id?.toString() ?? "")
    setIsEditDialogOpen(true)
  }

  async function handleUpdateProduct(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (!editingProduct) {
      return
    }

    if (!editCategoryId) {
      toast.error("Selectionnez une categorie")
      return
    }

    const userId = await getCurrentUserId()
    if (!userId) {
      toast.error("Session invalide. Reconnectez-vous.")
      return
    }

    setIsUpdating(true)
    const { error: updateError } = await supabase
      .from("produit")
      .update({
        name: editName.trim(),
        price: editPrice ? Number(editPrice) : null,
        stock: editStock ? Number(editStock) : null,
        description: editDescription.trim() || null,
        categorie_id: Number(editCategoryId),
      })
      .eq("id", editingProduct.id)
      .eq("user_id", userId)
    setIsUpdating(false)

    if (updateError) {
      toast.error(updateError.message)
      return
    }

    toast.success("Produit modifie")
    setIsEditDialogOpen(false)
    setEditingProduct(null)
    setIsLoading(true)
    await fetchProducts()
  }

  async function handleDeleteProduct(productId: number) {
    const userId = await getCurrentUserId()
    if (!userId) {
      toast.error("Session invalide. Reconnectez-vous.")
      return
    }

    setDeletingProductId(productId)
    const { error: deleteError } = await supabase
      .from("produit")
      .delete()
      .eq("id", productId)
      .eq("user_id", userId)
    setDeletingProductId(null)

    if (deleteError) {
      toast.error(deleteError.message)
      return
    }

    toast.success("Produit supprime")
    setIsLoading(true)
    await fetchProducts()
  }

  // Filter and paginate products
  const filteredProducts = products.filter(
    (product) =>
      product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      product.categorie?.name.toLowerCase().includes(searchQuery.toLowerCase())
  )
  const totalPages = Math.ceil(filteredProducts.length / ITEMS_PER_PAGE)
  const paginatedProducts = filteredProducts.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  )

  // Reset to page 1 when search query changes
  const handleSearch = (value: string) => {
    setSearchQuery(value)
    setCurrentPage(1)
  }

  return (
    <section className="space-y-4 rounded-xl border bg-card p-3 shadow-sm sm:p-4 md:p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
        <div className="flex items-start gap-3">
          <div className="rounded-lg bg-muted p-2">
            <Package className="size-4" />
          </div>
          <div>
            <h2 className="text-xl font-semibold">Produits</h2>
            
          </div>
        </div>

        <Dialog
          open={isDialogOpen}
          onOpenChange={(open) => {
            if (open && !hasCategories) {
              toast.error("Ajoutez d'abord une categorie avant un produit")
              return
            }
            setIsDialogOpen(open)
          }}
        >
          <DialogTrigger asChild>
            <Button className="w-full px-4 sm:w-auto">
              <Plus className="size-4" />
              Ajouter produit
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Nouveau produit</DialogTitle>
              <DialogDescription>
                Remplissez les informations pour creer un produit.
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleAddProduct} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="product-name">Nom</Label>
                <Input
                  id="product-name"
                  value={newName}
                  onChange={(event) => setNewName(event.target.value)}
                  placeholder="Ex: Mayonaise"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="product-price">Prix</Label>
                  <Input
                    id="product-price"
                    type="number"
                    min="0"
                    step="0.01"
                    value={newPrice}
                    onChange={(event) => setNewPrice(event.target.value)}
                    placeholder="0.00"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="product-stock">Stock</Label>
                  <Input
                    id="product-stock"
                    type="number"
                    min="0"
                    step="1"
                    value={newStock}
                    onChange={(event) => setNewStock(event.target.value)}
                    placeholder="0"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="product-category">Categorie</Label>
                <select
                  id="product-category"
                  className="h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                  value={newCategoryId}
                  onChange={(event) => setNewCategoryId(event.target.value)}
                  required
                >
                  <option value="">Choisir une categorie</option>
                  {categories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="product-description">Description</Label>
                <Textarea
                  id="product-description"
                  value={newDescription}
                  onChange={(event) => setNewDescription(event.target.value)}
                  placeholder="Description du produit"
                />
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
          Chargement des produits...
        </div>
      )}

      {!isLoading && error && (
        <p className="text-sm text-destructive">Erreur: {error}</p>
      )}

      {!isLoading && !error && products.length === 0 && (
        <Empty className="border">
          <EmptyHeader>
            <EmptyTitle>Aucun produit</EmptyTitle>
            <EmptyDescription>
              Commencez par ajouter un produit.
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      )}

      {!isLoading && !error && products.length > 0 && (
        <>
          <div className="flex items-center justify-between gap-3">
            <Input
              placeholder="Filter products..."
              value={searchQuery}
              onChange={(e) => handleSearch(e.target.value)}
              className="flex-1 border rounded-lg px-4 py-2 text-sm"
            />
            <div className="relative">
              <Button
                variant="outline"
                size="sm"
                className="gap-2"
                onClick={() => setColumnsOpen(!columnsOpen)}
              >
                Columns
                <ChevronDown className="size-4" />
              </Button>
              {columnsOpen && (
                <div className="absolute right-0 mt-2 w-48 bg-white border rounded-lg shadow-lg z-10">
                  <div className="p-2 space-y-2">
                    {[
                      { key: "id", label: "ID" },
                      { key: "name", label: "Nom" },
                      { key: "categorie", label: "Categorie" },
                      { key: "price", label: "Prix" },
                      { key: "stock", label: "Stock" },
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
              )}
            </div>
          </div>

          {filteredProducts.length === 0 ? (
            <Empty className="border">
              <EmptyHeader>
                <EmptyTitle>Aucun resultat</EmptyTitle>
                <EmptyDescription>
                  Aucun produit ne correspond a votre recherche.
                </EmptyDescription>
              </EmptyHeader>
            </Empty>
          ) : (
            <>
              <div className="border rounded-lg overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      {visibleColumns.id && <TableHead>ID</TableHead>}
                      {visibleColumns.name && <TableHead>Nom</TableHead>}
                      {visibleColumns.categorie && <TableHead>Categorie</TableHead>}
                      {visibleColumns.price && <TableHead>Prix</TableHead>}
                      {visibleColumns.stock && <TableHead>Stock</TableHead>}
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedProducts.map((product) => (
                      <TableRow key={product.id} className="hover:bg-muted/30">
                        {visibleColumns.id && <TableCell>{product.id}</TableCell>}
                        {visibleColumns.name && <TableCell>{product.name}</TableCell>}
                        {visibleColumns.categorie && <TableCell>{product.categorie?.name ?? "-"}</TableCell>}
                        {visibleColumns.price && <TableCell>{product.price ? `$${product.price.toFixed(2)}` : "-"}</TableCell>}
                        {visibleColumns.stock && <TableCell>{product.stock ?? "-"}</TableCell>}
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              onClick={() => openEditProductDialog(product)}
                            >
                              <Pencil className="size-4" />
                              <span className="sr-only">Edit</span>
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              onClick={() => setDeletingProductId(product.id)}
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
                <span className="text-sm text-muted-foreground">
                  {filteredProducts.length} item(s)
                </span>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                    disabled={currentPage === 1}
                  >
                    Previous
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
                    disabled={currentPage === totalPages}
                  >
                    Next
                  </Button>
                </div>
              </div>

              {/* Delete Confirmation Dialog */}
              {deletingProductId && (
                <AlertDialog open={true}>
                  <AlertDialogContent size="sm">
                    <AlertDialogHeader>
                      <div className="mb-2 inline-flex size-10 items-center justify-center rounded-md bg-destructive/10 text-destructive">
                        <MoreHorizontal className="size-5" />
                      </div>
                      <AlertDialogTitle>Delete Product?</AlertDialogTitle>
                      <AlertDialogDescription>
                        Are you sure? This action cannot be undone.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel onClick={() => setDeletingProductId(null)}>
                        Cancel
                      </AlertDialogCancel>
                      <AlertDialogAction
                        variant="destructive"
                        onClick={() => handleDeleteProduct(deletingProductId)}
                      >
                        Delete
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              )}
            </>
          )}
        </>
      )}

      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Modifier le produit</DialogTitle>
            <DialogDescription>
              Mettez a jour les informations du produit.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleUpdateProduct} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="product-edit-name">Nom</Label>
              <Input
                id="product-edit-name"
                value={editName}
                onChange={(event) => setEditName(event.target.value)}
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="product-edit-price">Prix</Label>
                <Input
                  id="product-edit-price"
                  type="number"
                  min="0"
                  step="0.01"
                  value={editPrice}
                  onChange={(event) => setEditPrice(event.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="product-edit-stock">Stock</Label>
                <Input
                  id="product-edit-stock"
                  type="number"
                  min="0"
                  step="1"
                  value={editStock}
                  onChange={(event) => setEditStock(event.target.value)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="product-edit-category">Categorie</Label>
              <select
                id="product-edit-category"
                className="h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                value={editCategoryId}
                onChange={(event) => setEditCategoryId(event.target.value)}
                required
              >
                <option value="">Choisir une categorie</option>
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="product-edit-description">Description</Label>
              <Textarea
                id="product-edit-description"
                value={editDescription}
                onChange={(event) => setEditDescription(event.target.value)}
              />
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
