// src/app/dashboard/leases/create/page.tsx
import { CreateLeaseForm } from '@/components/dashboard/landlord/CreateLeaseForm'; // Adjust path if needed

export default function CreateLeasePage() {
  return (
    <div className="container mx-auto py-10">
      <h1 className="text-2xl font-semibold mb-6">Create New Lease</h1>
      <CreateLeaseForm />
    </div>
  );
}
