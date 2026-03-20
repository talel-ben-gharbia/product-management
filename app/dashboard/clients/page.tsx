"use client"

import { FormEvent, useCallback, useEffect, useState } from "react"
import Link from "next/link"
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
import type { Database } from "@/lib/database.types"
import { supabase } from "@/lib/supabase"
import { Loader2, Plus, UserRound, ChevronDown, MoreHorizontal, Pencil, Trash2, Eye } from "lucide-react"
import { toast } from "sonner"

type Client = Pick<
  Database["public"]["Tables"]["client"]["Row"],
  "id" | "full_name" | "state" | "adress" | "phone" | "joined_at"
>

const ITEMS_PER_PAGE = 10

export default function ClientsPage() {
  const [clients, setClients] = useState<Client[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [newFullName, setNewFullName] = useState("")
  const [newState, setNewState] = useState(true)
  const [newAdress, setNewAdress] = useState("")
  const [newPhone, setNewPhone] = useState("")

  const [editingClient, setEditingClient] = useState<Client | null>(null)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [editFullName, setEditFullName] = useState("")
  const [editState, setEditState] = useState(true)
  const [editAdress, setEditAdress] = useState("")
  const [editPhone, setEditPhone] = useState("")
  const [isUpdating, setIsUpdating] = useState(false)

  const [deletingClientId, setDeletingClientId] = useState<number | null>(null)

  const [searchQuery, setSearchQuery] = useState("")
  const [currentPage, setCurrentPage] = useState(1)
  const [columnsOpen, setColumnsOpen] = useState(false)
  const [visibleColumns, setVisibleColumns] = useState({
    id: true,
    full_name: true,
    state: true,
    adress: true,
    phone: true,
    joined_at: true,
  })

  const fetchClients = useCallback(async () => {
    const { data, error: queryError } = await supabase
      .from("client")
      .select("id, full_name, state, adress, phone, joined_at")
      .order("id", { ascending: true })

    if (queryError) {
      setError(queryError.message)
      setClients([])
      setIsLoading(false)
      return
    }

    setClients((data as Client[]) ?? [])
    setError(null)
    setIsLoading(false)
  }, [])

  useEffect(() => {
    let isMounted = true
    const fetchTimer = window.setTimeout(() => {
      fetchClients().catch(() => {
        if (isMounted) {
          setError("Impossible de charger les clients")
          setIsLoading(false)
        }
      })
    }, 0)

    return () => {
      isMounted = false
      window.clearTimeout(fetchTimer)
    }
  }, [fetchClients])


  async function handleAddClient(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    const trimmedName = newFullName.trim()
    if (!trimmedName) {
      toast.error("Le nom du client est obligatoire")
      return
    }

    setIsSubmitting(true)
    const { error: insertError } = await supabase.from("client").insert({
      full_name: trimmedName,
      state: newState,
      adress: newAdress.trim() || null,
      phone: newPhone.trim() || null,
    })
    setIsSubmitting(false)

    if (insertError) {
      toast.error(insertError.message)
      return
    }

    toast.success("Client ajoute")
    setNewFullName("")
    setNewState(true)
    setNewAdress("")
    setNewPhone("")
    setIsDialogOpen(false)
    setIsLoading(true)
    await fetchClients()
  }

  function openEditClientDialog(client: Client) {
    setEditingClient(client)
    setEditFullName(client.full_name)
    setEditState(client.state)
    setEditAdress(client.adress ?? "")
    setEditPhone(client.phone ?? "")
    setIsEditDialogOpen(true)
  }

  async function handleUpdateClient(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (!editingClient) {
      return
    }

    const trimmedName = editFullName.trim()
    if (!trimmedName) {
      toast.error("Le nom du client est obligatoire")
      return
    }

    setIsUpdating(true)
    const { error: updateError } = await supabase
      .from("client")
      .update({
        full_name: trimmedName,
        state: editState,
        adress: editAdress.trim() || null,
        phone: editPhone.trim() || null,
      })
      .eq("id", editingClient.id)
    setIsUpdating(false)

    if (updateError) {
      toast.error(updateError.message)
      return
    }

    toast.success("Client modifie")
    setIsEditDialogOpen(false)
    setEditingClient(null)
    setIsLoading(true)
    await fetchClients()
  }

  async function handleDeleteClient(clientId: number) {
    setDeletingClientId(clientId)
    const { error: deleteError } = await supabase
      .from("client")
      .delete()
      .eq("id", clientId)
    setDeletingClientId(null)

    if (deleteError) {
      toast.error(deleteError.message)
      return
    }

    toast.success("Client supprime")
    setIsLoading(true)
    await fetchClients()
  }

  const filteredClients = clients.filter((client) => {
    const term = searchQuery.toLowerCase()
    return (
      client.full_name.toLowerCase().includes(term) ||
      (client.state ? "actif" : "inactif").includes(term) ||
      (client.phone ?? "").toLowerCase().includes(term)
    )
  })

  const totalPages = Math.max(1, Math.ceil(filteredClients.length / ITEMS_PER_PAGE))
  const paginatedClients = filteredClients.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  )

  const handleSearch = (value: string) => {
    setSearchQuery(value)
    setCurrentPage(1)
  }

  return (
    <section className="space-y-4 rounded-xl border bg-card p-3 shadow-sm sm:p-4 md:p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
        <div className="flex items-start gap-3">
          <div className="rounded-lg bg-muted p-2">
            <UserRound className="size-4" />
          </div>
          <div>
            <h2 className="text-xl font-semibold">Clients</h2>
          </div>
        </div>

        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button className="w-full px-4 sm:w-auto">
              <Plus className="size-4" />
              Ajouter client
            </Button>
          </DialogTrigger>
          <DialogContent className="app-dialog-content">
            <DialogHeader>
              <DialogTitle>Nouveau client</DialogTitle>
              <DialogDescription>
                Renseignez les informations du client.
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleAddClient} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="client-full-name">Nom complet</Label>
                <Input
                  id="client-full-name"
                  value={newFullName}
                  onChange={(event) => setNewFullName(event.target.value)}
                  placeholder="Ex: Ahmed Ben Ali"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="client-state">Etat</Label>
                  <CustomSelect
                    value={newState ? "true" : "false"}
                    onChange={(value) => setNewState(value === "true")}
                    options={[
                      { value: "true", label: "Actif" },
                      { value: "false", label: "Inactif" },
                    ]}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="client-phone">Telephone</Label>
                  <Input
                    id="client-phone"
                    value={newPhone}
                    onChange={(event) => setNewPhone(event.target.value)}
                    placeholder="+216..."
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="client-adress">Adresse</Label>
                <Input
                  id="client-adress"
                  value={newAdress}
                  onChange={(event) => setNewAdress(event.target.value)}
                  placeholder="Adresse du client"
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
          Chargement des clients...
        </div>
      )}

      {!isLoading && error && <p className="text-sm text-destructive">Erreur: {error}</p>}

      {!isLoading && !error && clients.length === 0 && (
        <Empty className="border">
          <EmptyHeader>
            <EmptyTitle>Aucun client</EmptyTitle>
            <EmptyDescription>Commencez par ajouter un client.</EmptyDescription>
          </EmptyHeader>
        </Empty>
      )}

      {!isLoading && !error && clients.length > 0 && (
        <>
          <div className="flex items-center justify-between gap-3">
            <Input
              placeholder="Rechercher un client..."
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
                className={`columns-panel w-48 ${
                  columnsOpen
                    ? "pointer-events-auto translate-y-0 scale-100 opacity-100"
                    : "pointer-events-none -translate-y-1 scale-95 opacity-0"
                }`}
              >
                  <div className="p-2 space-y-2">
                    {[
                      { key: "id", label: "ID" },
                      { key: "full_name", label: "Nom" },
                      { key: "state", label: "Etat" },
                      { key: "adress", label: "Adresse" },
                      { key: "phone", label: "Telephone" },
                      { key: "joined_at", label: "Inscrit le" },
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

          {filteredClients.length === 0 ? (
            <Empty className="border">
              <EmptyHeader>
                <EmptyTitle>Aucun resultat</EmptyTitle>
                <EmptyDescription>Aucun client ne correspond a votre recherche.</EmptyDescription>
              </EmptyHeader>
            </Empty>
          ) : (
            <>
              <div className="border rounded-lg overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      {visibleColumns.id && <TableHead>ID</TableHead>}
                      {visibleColumns.full_name && <TableHead>Nom</TableHead>}
                      {visibleColumns.state && <TableHead>Etat</TableHead>}
                      {visibleColumns.adress && <TableHead>Adresse</TableHead>}
                      {visibleColumns.phone && <TableHead>Telephone</TableHead>}
                      {visibleColumns.joined_at && <TableHead>Inscrit le</TableHead>}
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedClients.map((client) => (
                      <TableRow key={client.id} className="hover:bg-muted/30">
                        {visibleColumns.id && <TableCell>{client.id}</TableCell>}
                        {visibleColumns.full_name && <TableCell>{client.full_name}</TableCell>}
                        {visibleColumns.state && (
                          <TableCell>
                            <Badge
                              variant="outline"
                              className={client.state ? "bg-green-100 text-green-800 border-green-300" : "bg-gray-100 text-gray-700 border-gray-300"}
                            >
                              {client.state ? "Actif" : "Inactif"}
                            </Badge>
                          </TableCell>
                        )}
                        {visibleColumns.adress && <TableCell>{client.adress ?? "-"}</TableCell>}
                        {visibleColumns.phone && <TableCell>{client.phone ?? "-"}</TableCell>}
                        {visibleColumns.joined_at && (
                          <TableCell>{client.joined_at ? new Date(client.joined_at).toLocaleString() : "-"}</TableCell>
                        )}
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button variant="ghost" size="icon-sm" asChild>
                              <Link href={`/dashboard/clients/${client.id}`}>
                                <Eye className="size-4" />
                                <span className="sr-only">Details</span>
                              </Link>
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              onClick={() => openEditClientDialog(client)}
                            >
                              <Pencil className="size-4" />
                              <span className="sr-only">Edit</span>
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              onClick={() => setDeletingClientId(client.id)}
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
                <span className="text-sm text-muted-foreground">{filteredClients.length} element(s)</span>
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

              {deletingClientId && (
                <AlertDialog open={true}>
                  <AlertDialogContent size="sm" className="app-alert-content">
                    <AlertDialogHeader>
                      <div className="mb-2 inline-flex size-10 items-center justify-center rounded-md bg-destructive/10 text-destructive">
                        <MoreHorizontal className="size-5" />
                      </div>
                      <AlertDialogTitle>Supprimer le client ?</AlertDialogTitle>
                      <AlertDialogDescription>Cette action est irreversible.</AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel onClick={() => setDeletingClientId(null)}>Annuler</AlertDialogCancel>
                      <AlertDialogAction
                        variant="destructive"
                        onClick={() => handleDeleteClient(deletingClientId)}
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

      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="app-dialog-content">
          <DialogHeader>
            <DialogTitle>Modifier le client</DialogTitle>
            <DialogDescription>Mettez a jour les informations du client.</DialogDescription>
          </DialogHeader>

          <form onSubmit={handleUpdateClient} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="client-edit-full-name">Nom complet</Label>
              <Input
                id="client-edit-full-name"
                value={editFullName}
                onChange={(event) => setEditFullName(event.target.value)}
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="client-edit-state">Etat</Label>
                <CustomSelect
                  value={editState ? "true" : "false"}
                  onChange={(value) => setEditState(value === "true")}
                  options={[
                    { value: "true", label: "Actif" },
                    { value: "false", label: "Inactif" },
                  ]}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="client-edit-phone">Telephone</Label>
                <Input
                  id="client-edit-phone"
                  value={editPhone}
                  onChange={(event) => setEditPhone(event.target.value)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="client-edit-adress">Adresse</Label>
              <Input
                id="client-edit-adress"
                value={editAdress}
                onChange={(event) => setEditAdress(event.target.value)}
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
