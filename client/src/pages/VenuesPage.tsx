import { useEffect } from "react";
import { VenueManagement } from "@/components/VenueManagement";

export default function VenuesPage() {
  // Set page title
  useEffect(() => {
    document.title = "会場管理 | TEAMOコーチ";
  }, []);

  return <VenueManagement />;
}
