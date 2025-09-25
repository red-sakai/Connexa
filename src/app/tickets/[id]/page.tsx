import Ticket from "../../components/sections/Ticket";

export default async function TicketPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <Ticket eventId={id} />;
}
