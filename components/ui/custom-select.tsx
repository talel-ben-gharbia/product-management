"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { ChevronDown } from "lucide-react"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"

type CustomSelectOption = {
  value: string
  label: string
}

type CustomSelectProps = {
  id?: string
  value: string
  onChange: (value: string) => void
  options: CustomSelectOption[]
  placeholder?: string
  disabled?: boolean
  className?: string
  searchable?: boolean
  searchValue?: string
  onSearchChange?: (value: string) => void
  searchPlaceholder?: string
  isLoading?: boolean
  emptyText?: string
  onOpenChange?: (open: boolean) => void
}

export function CustomSelect({
  id,
  value,
  onChange,
  options,
  placeholder = "Choisir",
  disabled = false,
  className,
  searchable = false,
  searchValue = "",
  onSearchChange,
  searchPlaceholder = "Rechercher...",
  isLoading = false,
  emptyText = "Aucun resultat",
  onOpenChange,
}: CustomSelectProps) {
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement | null>(null)

  const updateOpen = useCallback(
    (nextOpen: boolean) => {
      setOpen(nextOpen)
      onOpenChange?.(nextOpen)
    },
    [onOpenChange]
  )

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (!containerRef.current) {
        return
      }

      const target = event.target as Node
      if (!containerRef.current.contains(target)) {
        updateOpen(false)
      }
    }

    document.addEventListener("mousedown", handleClickOutside)
    return () => {
      document.removeEventListener("mousedown", handleClickOutside)
    }
  }, [updateOpen])

  const selected = options.find((option) => option.value === value)

  return (
    <div ref={containerRef} className={cn("relative", className)}>
      <button
        id={id}
        type="button"
        className="app-select flex h-9 items-center justify-between text-left"
        onClick={() => updateOpen(!open)}
        disabled={disabled}
        aria-expanded={open}
        title={selected?.label ?? placeholder}
      >
        <span className={cn("block flex-1 truncate pr-2", !selected && "text-muted-foreground")}>
          {selected?.label ?? placeholder}
        </span>
        <ChevronDown
          className={cn(
            "size-4 text-muted-foreground transition-transform duration-200",
            open ? "rotate-180" : "rotate-0"
          )}
        />
      </button>

      <div
        className={cn(
          "columns-panel left-0 right-0 mt-1 max-h-56 overflow-y-auto p-1",
          open
            ? "pointer-events-auto translate-y-0 scale-100 opacity-100"
            : "pointer-events-none -translate-y-1 scale-95 opacity-0"
        )}
      >
        {searchable && (
          <div className="sticky top-0 z-10 bg-card p-1">
            <Input
              type="text"
              value={searchValue}
              onChange={(event) => onSearchChange?.(event.target.value)}
              placeholder={searchPlaceholder}
              className="h-9"
            />
          </div>
        )}

        {isLoading && <p className="px-2.5 py-2 text-sm text-muted-foreground">Chargement...</p>}

        {!isLoading && options.length === 0 && (
          <p className="px-2.5 py-2 text-sm text-muted-foreground">{emptyText}</p>
        )}

        {!isLoading &&
          options.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => {
                onChange(option.value)
                updateOpen(false)
              }}
              className={cn(
                  "w-full truncate rounded-md px-2.5 py-2 text-left text-sm whitespace-nowrap transition-colors",
                option.value === value
                  ? "bg-accent text-accent-foreground"
                  : "hover:bg-muted"
              )}
                title={option.label}
            >
              {option.label}
            </button>
          ))}
      </div>
    </div>
  )
}
