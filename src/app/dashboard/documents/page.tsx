import DocumentInbox from '@/components/dashboard/landlord/DocumentInbox';

export default async function DocumentsPage({
  searchParams,
}: {
  searchParams: Promise<{ document?: string }>;
}) {
  const { document } = await searchParams;

  return (
    <div className="p-6">
      <DocumentInbox focusDocumentId={document} />
    </div>
  );
}
