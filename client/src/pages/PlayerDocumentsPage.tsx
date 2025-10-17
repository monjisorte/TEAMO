import SharedDocuments from "@/components/player/SharedDocuments";

interface PlayerDocumentsPageProps {
  teamId: string;
}

export default function PlayerDocumentsPage({ teamId }: PlayerDocumentsPageProps) {
  return <SharedDocuments teamId={teamId} />;
}
