import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { headers } from 'next/headers';
import { fetchWithRetry } from '@/lib/api/fetchWithRetry';
import { notFound } from 'next/navigation';
import ColumnDetail from '@/components/columns/ColumnDetail';
import type { Column } from '@/types/Column';

async function fetchColumn(slug: string): Promise<Column | null> {
  const headersList = await headers();
  const protocol = headersList.get('x-forwarded-proto') ?? 'http';
  const host = headersList.get('host');
  const baseUrl = `${protocol}://${host}`;

  try {
    const res = await fetchWithRetry(`${baseUrl}/api/columns/slug/${slug}`, {
      cache: 'no-store',
    });
    const data = await res.json();
    return data.success ? data.data.column : null;
  } catch (error) {
    console.error('Column fetch error:', error);
    return null;
  }
}

export const dynamic = 'force-dynamic';

export default async function ColumnDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const column = await fetchColumn(slug);
  if (!column) {
    notFound();
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-200">
        <div className="container mx-auto px-4 py-4">
          <Link
            href="/columns"
            className="inline-flex items-center text-gray-600 hover:text-gray-900 transition-colors"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            コラム一覧に戻る
          </Link>
        </div>
      </div>
      <div className="container mx-auto px-4 py-8">
        <ColumnDetail column={column} />
      </div>
    </div>
  );
}
