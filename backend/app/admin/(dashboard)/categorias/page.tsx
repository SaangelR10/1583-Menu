import { CategoryManager } from "@/components/admin/CategoryManager";
import { PageHeader } from "@/components/admin/ui/Primitives";

export default function CategoriesPage() {
  return (
    <div>
      <PageHeader
        title="Categorias"
        description="Arrastra para reordenar. Solo las categorias activas aparecen en el menú público."
      />
      <CategoryManager />
    </div>
  );
}
