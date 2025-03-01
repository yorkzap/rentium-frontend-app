import { Button } from '@/components/ui/button';
import Link from 'next/link'; // Changed from lucide-react
import { X } from 'lucide-react'; // For the close icon

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <div className="flex-1 flex flex-col justify-center px-4 sm:px-6 lg:px-8">
        <div className="absolute top-6 left-6">
          <Link href="/" className="text-2xl font-bold text-slate-900">
            Transendity
          </Link>
        </div>
        <div className="absolute top-6 right-6">
          <Button variant="ghost" size="sm" asChild>
            <Link href="/">
              <X className="h-4 w-4" />
            </Link>
          </Button>
        </div>
        {children}
      </div>
    </div>
  );
}
