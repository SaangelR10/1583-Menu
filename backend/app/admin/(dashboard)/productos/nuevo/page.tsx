import { ProductForm } from "@/components/admin/ProductForm";
import { PageHeader } from "@/components/admin/ui/Primitives";

export default function NewProductPage() {
  return (
    <div>
      <PageHeader title="Nuevo producto" />
      <ProductForm />
    </div>
  );
}
