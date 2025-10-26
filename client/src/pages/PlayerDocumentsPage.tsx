import { useEffect } from "react";
import SharedDocuments from "@/components/player/SharedDocuments";

interface PlayerDocumentsPageProps {
  teamId: string;
}

export default function PlayerDocumentsPage({ teamId }: PlayerDocumentsPageProps) {
  // Set page title
  useEffect(() => {
    document.title = "共有資料 | TEAMO";
  }, []);

  return <SharedDocuments teamId={teamId} />;
}
