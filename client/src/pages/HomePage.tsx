import { useEffect } from "react";
import { Dashboard } from "@/components/Dashboard";

export default function HomePage() {
  // Set page title
  useEffect(() => {
    document.title = "TEAMOコーチ | ダッシュボード";
  }, []);

  return <Dashboard />;
}
