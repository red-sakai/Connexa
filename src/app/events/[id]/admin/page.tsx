import AdminPanel from "../../../components/sections/AdminPanel";

export default async function AdminPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <AdminPanel eventId={id} />;
}
