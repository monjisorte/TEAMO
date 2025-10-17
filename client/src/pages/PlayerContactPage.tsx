import ContactForm from "@/components/player/ContactForm";

interface PlayerContactPageProps {
  teamId: string;
  playerName: string;
  playerEmail: string;
}

export default function PlayerContactPage({ teamId, playerName, playerEmail }: PlayerContactPageProps) {
  return (
    <ContactForm 
      teamId={teamId}
      studentName={playerName}
      studentEmail={playerEmail}
    />
  );
}
