import { useEffect } from "react";
import { CoachManagement } from "@/components/CoachManagement";

export default function CoachesPage() {
  // Set page title
  useEffect(() => {
    document.title = "スタッフ管理 | TEAMOコーチ";
  }, []);

  return <CoachManagement />;
}
