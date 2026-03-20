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
import { supabase } from "@/lib/supabase"
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from "@/components/ui/empty"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import type { Database } from "@/lib/database.types"
import { FolderTree, Loader2, Plus, ChevronDown, MoreHorizontal, Pencil, Trash2 } from "lucide-react"
import { toast } from "sonner"

type Category = Pick<
  Database["public"]["Tables"]["categorie"]["Row"],
  "id" | "name" | "user_id"
>

const ITEMS_PER_PAGE = 10

export default function CategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [newCategoryName, setNewCategoryName] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [editingCategory, setEditingCategory] = useState<Category | null>(null)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [updatedCategoryName, setUpdatedCategoryName] = useState("")
  const [isUpdating, setIsUpdating] = useState(false)
  const [deletingCategoryId, setDeletingCategoryId] = useState<number | null>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [currentPage, setCurrentPage] = useState(1)
  const [selectedCategories, setSelectedCategories] = useState<number[]>([])
  const [visibleColumns, setVisibleColumns] = useState({
    id: true,
    name: true,
  })
  const [columnsOpen, setColumnsOpen] = useState(false)

  const toggleRowSelection = (categoryId: number) => {
    setSelectedCategories((prev) =>
      prev.includes(categoryId)
        ? prev.filter((id) => id !== categoryId)
        : [...prev, categoryId]
    )
  }

  const toggleAllRowsSelection = () => {
    if (selectedCategories.length === paginatedCategories.length) {
      setSelectedCategories([])
    } else {
      setSelectedCategories(paginatedCategories.map((c) => c.id))
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

  const fetchCategories = useCallback(async () => {
    const userId = await getCurrentUserId()

    if (!userId) {
      setError("Session invalide. Reconnectez-vous.")
      setCategories([])
      setIsLoading(false)
      return
    }

    const { data, error: queryError } = await supabase
      .from("categorie")
      .select("id, name, user_id")
      .eq("user_id", userId)
      .order("id", { ascending: true })

    if (queryError) {
      setError(queryError.message)
      setCategories([])
      setIsLoading(false)
      return
    }

    setCategories((data as Category[]) ?? [])
    setError(null)
    setIsLoading(false)
  }, [getCurrentUserId])

  useEffect(() => {
    let isMounted = true
    const fetchTimer = window.setTimeout(() => {
      fetchCategories().catch(() => {
        if (isMounted) {
          setError("Impossible de charger les categories")
          setIsLoading(false)
        }
      })
    }, 0)

    return () => {
      isMounted = false
      window.clearTimeout(fetchTimer)
    }
  }, [fetchCategories])

  async function handleAddCategory(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    const trimmedName = newCategoryName.trim()
    if (!trimmedName) {
      toast.error("Le nom de la categorie est obligatoire")
      return
    }

    setIsSubmitting(true)
    const userId = await getCurrentUserId()

    if (!userId) {
      setIsSubmitting(false)
      toast.error("Session invalide. Reconnectez-vous.")
      return
    }

    const { error: insertError } = await supabase
      .from("categorie")
      .insert({ name: trimmedName, user_id: userId })
    setIsSubmitting(false)

    if (insertError) {
      toast.error(insertError.message)
      return
    }

    toast.success("Categorie ajoutee")
    setNewCategoryName("")
    setIsDialogOpen(false)
    setIsLoading(true)
    await fetchCategories()
  }

  function openEditCategoryDialog(category: Category) {
    setEditingCategory(category)
    setUpdatedCategoryName(category.name)
    setIsEditDialogOpen(true)
  }

  async function handleUpdateCategory(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    const trimmedName = updatedCategoryName.trim()
    if (!editingCategory || !trimmedName) {
      toast.error("Le nom de la categorie est obligatoire")
      return
    }

    const userId = await getCurrentUserId()
    if (!userId) {
      toast.error("Session invalide. Reconnectez-vous.")
      return
    }

    setIsUpdating(true)
    const { error: updateError } = await supabase
      .from("categorie")
      .update({ name: trimmedName })
      .eq("id", editingCategory.id)
      .eq("user_id", userId)
    setIsUpdating(false)

    if (updateError) {
      toast.error(updateError.message)
      return
    }

    toast.success("Categorie modifiee")
    setIsEditDialogOpen(false)
    setEditingCategory(null)
    setIsLoading(true)
    await fetchCategories()
  }

  async function handleDeleteCategory(categoryId: number) {
    const userId = await getCurrentUserId()
    if (!userId) {
      toast.error("Session invalide. Reconnectez-vous.")
      return
    }

    setDeletingCategoryId(categoryId)
    const { error: deleteError } = await supabase
      .from("categorie")
      .delete()
      .eq("id", categoryId)
      .eq("user_id", userId)
    setDeletingCategoryId(null)

    if (deleteError) {
      toast.error(deleteError.message)
      return
    }

    toast.success("Categorie supprimee")
    setIsLoading(true)
    await fetchCategories()
  }

  // Filter and paginate categories
  const filteredCategories = categories.filter((category) =>
    category.name.toLowerCase().includes(searchQuery.toLowerCase())
  )
  const totalPages = Math.ceil(filteredCategories.length / ITEMS_PER_PAGE)
  const paginatedCategories = filteredCategories.slice(
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
            <FolderTree className="size-4" />
          </div>
          <div>
            <h2 className="text-xl font-semibold">Categories</h2>
            
          </div>
        </div>

        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button className="w-full px-4 sm:w-auto">
              <Plus className="size-4" />
              Ajouter categorie
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Nouvelle categorie</DialogTitle>
              <DialogDescription>
                Renseignez le nom de la categorie a ajouter.
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleAddCategory} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="category-name">Nom</Label>
                <Input
                  id="category-name"
                  value={newCategoryName}
                  onChange={(event) => setNewCategoryName(event.target.value)}
                  placeholder="Ex: Mayonaise"
                  required
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

      {!isLoading && !error && categories.length > 0 && (
        <>
          <div className="flex items-center justify-between gap-3">
            <Input
              placeholder="Filter categories..."
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

          {filteredCategories.length === 0 ? (
            <Empty className="border">
              <EmptyHeader>
                <EmptyTitle>Aucun resultat</EmptyTitle>
                <EmptyDescription>
                  Aucune categorie ne correspond a votre recherche.
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
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedCategories.map((category) => (
                      <TableRow key={category.id} className="hover:bg-muted/30">
                        {visibleColumns.id && <TableCell>{category.id}</TableCell>}
                        {visibleColumns.name && <TableCell>{category.name}</TableCell>}
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              onClick={() => openEditCategoryDialog(category)}
                            >
                              <Pencil className="size-4" />
                              <span className="sr-only">Edit</span>
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              onClick={() => setDeletingCategoryId(category.id)}
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
                  {filteredCategories.length} item(s)
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
              {deletingCategoryId && (
                <AlertDialog open={true}>
                  <AlertDialogContent size="sm">
                    <AlertDialogHeader>
                      <div className="mb-2 inline-flex size-10 items-center justify-center rounded-md bg-destructive/10 text-destructive">
                        <MoreHorizontal className="size-5" />
                      </div>
                      <AlertDialogTitle>Delete Category?</AlertDialogTitle>
                      <AlertDialogDescription>
                        Are you sure? This action cannot be undone.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel onClick={() => setDeletingCategoryId(null)}>
                        Cancel
                      </AlertDialogCancel>
                      <AlertDialogAction
                        variant="destructive"
                        onClick={() => handleDeleteCategory(deletingCategoryId)}
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

      {isLoading && (
        <div className="flex items-center gap-2 rounded-lg border bg-muted/30 px-3 py-2 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" />
          Chargement des categories...
        </div>
      )}

      {!isLoading && error && (
        <p className="text-sm text-destructive">Erreur: {error}</p>
      )}

      {!isLoading && !error && categories.length === 0 && (
        <Empty className="border">
          <EmptyHeader>
            <EmptyTitle>Aucune categorie</EmptyTitle>
            <EmptyDescription>
              Commencez par ajouter une categorie .
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      )}

      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Modifier la categorie</DialogTitle>
            <DialogDescription>
              Mettez a jour le nom de la categorie.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleUpdateCategory} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="category-edit-name">Nom</Label>
              <Input
                id="category-edit-name"
                value={updatedCategoryName}
                onChange={(event) => setUpdatedCategoryName(event.target.value)}
                required
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
