import { useEffect } from "react";
import { CategoryManagement } from "@/components/CategoryManagement";

export default function CategoriesPage() {
  // Set page title
  useEffect(() => {
    document.title = "カテゴリ管理 | TEAMOコーチ";
  }, []);

  return <CategoryManagement />;
}
