import { redirect } from "next/navigation";

export default async function EditorialAdminPage() {
  redirect("/admin/editorial/sources");
}
