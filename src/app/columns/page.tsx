'use client';

import { useState } from 'react';
import { useFetch } from '@/lib/api';
import Image from 'next/image';
import { ColumnSummary } from '@/types/Column';
import { formatDate } from '@/lib/utils/date';

type SortOrder = 'views' | 'date-asc' | 'date-desc';

export default function ColumnsPage() {
  const [sortOrder, setSortOrder] = useState<SortOrder>('views');
  
  // 共通フックを使用してAPI呼び出しを統一
  const { data: apiResponse, loading, error, refetch } = useFetch<{
    success: boolean;
    data: { columns: ColumnSummary[] };
    message?: string;
  }>('/api/columns?limit=50');

  const columns = apiResponse?.success ? apiResponse.data.columns : [];

  const sortedColumns = [...columns].sort((a, b) => {
    switch (sortOrder) {
      case 'views':
        return b.views - a.views;
      case 'date-asc':
        return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      case 'date-desc':
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      default:
        return b.views - a.views;
    }
  });

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">コラムを読み込み中...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 mb-4">エラー: {error}</p>
          <button
            onClick={refetch}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
          >
            再試行
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">
            コラム一覧
          </h1>
          <p className="text-gray-600">
            Gemini Canvasに関する記事やガイドをお読みいただけます
          </p>
        </div>

        {/* 並び替えコントロール */}
        <div className="mb-6 flex flex-wrap gap-2">
          <button
            onClick={() => setSortOrder('views')}
            className={`px-4 py-2 rounded-lg transition-colors ${
              sortOrder === 'views'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            観覧数順
          </button>
          <button
            onClick={() => setSortOrder('date-asc')}
            className={`px-4 py-2 rounded-lg transition-colors ${
              sortOrder === 'date-asc'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            日付昇順
          </button>
          <button
            onClick={() => setSortOrder('date-desc')}
            className={`px-4 py-2 rounded-lg transition-colors ${
              sortOrder === 'date-desc'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            日付降順
          </button>
        </div>

        {/* コラム一覧 */}
        <div className="space-y-6">
          {sortedColumns.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-500 text-lg">コラムがありません</p>
            </div>
          ) : (
            sortedColumns.map((column) => (
              <div
                key={column.id}
                className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow cursor-pointer"
                onClick={() => window.location.href = `/columns/${column.slug}`}
              >
                <div className="flex flex-col md:flex-row">
                  {column.coverImage && (
                    <div className="md:w-64 h-48 md:h-auto bg-gray-200">
                      <Image 
                        src={column.coverImage} 
                        alt={column.title}
                        width={256}
                        height={192}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  )}
                  <div className="flex-1 p-6">
                    <div className="flex items-center mb-2">
                      <span className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded">
                        {column.category}
                      </span>
                      <span className="text-gray-500 text-sm ml-4">
                        {formatDate(column.createdAt, { monthFormat: 'long' })}
                      </span>
                      {column.featured && (
                        <span className="bg-yellow-100 text-yellow-800 text-xs px-2 py-1 rounded ml-2">
                          注目
                        </span>
                      )}
                    </div>
                    <h2 className="text-xl font-bold text-gray-900 mb-2 hover:text-blue-600">
                      {column.title}
                    </h2>
                    <p className="text-gray-600 mb-4 line-clamp-3">
                      {column.excerpt}
                    </p>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        <span className="text-sm text-gray-500">
                          👁 {(column.views ?? 0).toLocaleString()} 回閲覧
                        </span>
                        <span className="text-sm text-gray-500">
                          ❤️ {(column.likes ?? 0).toLocaleString()} いいね
                        </span>
                      </div>
                      <span className="text-sm text-gray-500">
                        by {column.author}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>


      </div>
    </div>
  );
}