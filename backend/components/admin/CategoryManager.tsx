"use client";

import { useEffect, useState } from "react";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import { SortableContext, useSortable, verticalListSortingStrategy, arrayMove } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { apiFetch, ApiError } from "@/lib/client/apiClient";
import { Button, Card, Input, Switch, Badge, FormField, EmptyState, Spinner } from "@/components/admin/ui/Primitives";

type Category = {
  id: string;
  name: string;
  nameEn: string;
  isActive: boolean;
  sortOrder: number;
  _count: { products: number };
};

function SortableRow({
  category,
  onToggleActive,
  onEdit,
  onDelete,
}: {
  category: Category;
  onToggleActive: (id: string, value: boolean) => void;
  onEdit: (category: Category) => void;
  onDelete: (id: string) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: category.id,
  });

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={`flex flex-wrap items-center gap-3 rounded-lg border border-border bg-surface px-3 py-3 sm:px-4 ${
        isDragging ? "opacity-60" : ""
      }`}
    >
      <button
        {...attributes}
        {...listeners}
        className="shrink-0 cursor-grab touch-none px-1 text-ink-muted active:cursor-grabbing"
        aria-label="Reordenar"
      >
        ⠿
      </button>
      <div className="min-w-0 flex-1 basis-full sm:basis-auto">
        <p className="truncate font-medium text-ink">{category.name}</p>
        <p className="truncate text-xs text-ink-muted">{category.nameEn || "sin traduccion"}</p>
      </div>
      <div className="flex flex-wrap items-center gap-2 pl-7 sm:pl-0">
        <Badge>{category._count.products} productos</Badge>
        <div title="Inactiva = se oculta del menú público, junto con todos sus productos">
          <Switch checked={category.isActive} onChange={(v) => onToggleActive(category.id, v)} label="Activa" />
        </div>
        <Button variant="secondary" size="sm" onClick={() => onEdit(category)}>
          Editar
        </Button>
        <Button
          variant="ghost"
          size="sm"
          disabled={category._count.products > 0}
          title={category._count.products > 0 ? "Mueve o elimina sus productos primero" : "Eliminar"}
          onClick={() => onDelete(category.id)}
        >
          Eliminar
        </Button>
      </div>
    </div>
  );
}

export function CategoryManager() {
  const [categories, setCategories] = useState<Category[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<Category | null>(null);
  const [creating, setCreating] = useState(false);
  const [formName, setFormName] = useState("");
  const [formNameEn, setFormNameEn] = useState("");
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  async function load() {
    const { categories } = await apiFetch<{ categories: Category[] }>("/api/v1/admin/categories");
    setCategories(categories);
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- carga inicial async estandar
    load();
  }, []);

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id || !categories) return;
    const oldIndex = categories.findIndex((c) => c.id === active.id);
    const newIndex = categories.findIndex((c) => c.id === over.id);
    const reordered = arrayMove(categories, oldIndex, newIndex);
    setCategories(reordered);
    try {
      await apiFetch("/api/v1/admin/categories/reorder", {
        method: "POST",
        body: JSON.stringify({ orderedIds: reordered.map((c) => c.id) }),
      });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "No se pudo reordenar.");
      load();
    }
  }

  async function toggleActive(id: string, value: boolean) {
    setCategories((prev) => prev?.map((c) => (c.id === id ? { ...c, isActive: value } : c)) ?? prev);
    try {
      await apiFetch(`/api/v1/admin/categories/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ isActive: value }),
      });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "No se pudo actualizar.");
      load();
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("¿Eliminar esta categoria?")) return;
    try {
      await apiFetch(`/api/v1/admin/categories/${id}`, { method: "DELETE" });
      load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "No se pudo eliminar.");
    }
  }

  function openEdit(category: Category) {
    setEditing(category);
    setFormName(category.name);
    setFormNameEn(category.nameEn);
    setCreating(false);
  }

  function openCreate() {
    setCreating(true);
    setEditing(null);
    setFormName("");
    setFormNameEn("");
  }

  async function submitForm(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      if (editing) {
        await apiFetch(`/api/v1/admin/categories/${editing.id}`, {
          method: "PATCH",
          body: JSON.stringify({ name: formName, nameEn: formNameEn }),
        });
      } else {
        await apiFetch("/api/v1/admin/categories", {
          method: "POST",
          body: JSON.stringify({ name: formName, nameEn: formNameEn }),
        });
      }
      setEditing(null);
      setCreating(false);
      load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "No se pudo guardar.");
    }
  }

  if (!categories) {
    return (
      <div className="flex justify-center py-20">
        <Spinner className="h-6 w-6 text-gold" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <Button onClick={openCreate}>+ Nueva categoria</Button>
      </div>

      {error && <p className="rounded-lg bg-danger/10 px-3 py-2 text-sm text-danger">{error}</p>}

      {(creating || editing) && (
        <Card>
          <form className="grid grid-cols-1 gap-4 sm:grid-cols-3" onSubmit={submitForm}>
            <FormField label="Nombre (español)">
              <Input required value={formName} onChange={(e) => setFormName(e.target.value)} />
            </FormField>
            <FormField label="Nombre (ingles)">
              <Input value={formNameEn} onChange={(e) => setFormNameEn(e.target.value)} />
            </FormField>
            <div className="flex items-end gap-2">
              <Button type="submit">{editing ? "Guardar" : "Crear"}</Button>
              <Button
                type="button"
                variant="secondary"
                onClick={() => {
                  setEditing(null);
                  setCreating(false);
                }}
              >
                Cancelar
              </Button>
            </div>
          </form>
        </Card>
      )}

      {categories.length === 0 ? (
        <EmptyState title="Sin categorias" description="Crea la primera categoria del menú." />
      ) : (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={categories.map((c) => c.id)} strategy={verticalListSortingStrategy}>
            <div className="space-y-2">
              {categories.map((category) => (
                <SortableRow
                  key={category.id}
                  category={category}
                  onToggleActive={toggleActive}
                  onEdit={openEdit}
                  onDelete={handleDelete}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}
    </div>
  );
}
