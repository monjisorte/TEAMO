import { useEffect } from "react";
import { ScheduleList } from "@/components/ScheduleList";

export default function SchedulesPage() {
  // Set page title
  useEffect(() => {
    document.title = "スケジュール | TEAMOコーチ";
  }, []);

  return <ScheduleList />;
}
