'use client';

import Image from 'next/image';
import { Eye, Heart, Calendar } from 'lucide-react';
import type { Column } from '@/types/Column';
import { formatDate } from '@/lib/utils/date';

interface ColumnDetailProps {
  column: Column;
}



export function ColumnDetail({ column }: ColumnDetailProps) {
  return (
    <article className="max-w-4xl mx-auto">
      {/* 記事ヘッダー */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden mb-8">
        {/* カバー画像 */}
        {column.coverImage && (
          <div className="aspect-video bg-gray-200">
            <Image
              src={column.coverImage}
              alt={column.title}
              width={800}
              height={450}
              className="w-full h-full object-cover"
            />
          </div>
        )}

        <div className="p-8">
          {/* カテゴリとメタ情報 */}
          <div className="flex flex-wrap items-center gap-4 mb-6">
            <span className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm font-medium">
              {column.category}
            </span>

            {column.featured && (
              <span className="bg-yellow-100 text-yellow-800 px-3 py-1 rounded-full text-sm font-medium">
                ⭐ おすすめ
              </span>
            )}
          </div>

          {/* タイトル */}
          <h1 className="text-4xl font-bold text-gray-900 leading-tight mb-6">
            {column.title}
          </h1>

          {/* 著者情報とメタデータ */}
          <div className="flex flex-wrap items-center justify-between gap-4 pb-6 border-b border-gray-100">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-3">
                <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                  <span className="text-white font-semibold">
                    {column.author?.charAt(0) || '?'}
                  </span>
                </div>
                <div>
                  <p className="font-medium text-gray-900">{column.author || '編集部'}</p>
                  <div className="flex items-center space-x-4 text-sm text-gray-600">
                    <div className="flex items-center space-x-1">
                      <Calendar className="w-4 h-4" />
                      <span>{formatDate(column.createdAt, { monthFormat: 'long' })}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex items-center space-x-6 text-sm text-gray-600">
              <div className="flex items-center space-x-1">
                <Eye className="w-4 h-4" />
                <span>{(column.views ?? 0).toLocaleString()} 回閲覧</span>
              </div>
              <div className="flex items-center space-x-1">
                <Heart className="w-4 h-4" />
                <span>{(column.likes ?? 0).toLocaleString()} いいね</span>
              </div>
            </div>
          </div>

          {/* 概要 */}
          <div className="mt-6 p-6 bg-gray-50 rounded-lg border-l-4 border-blue-500">
            <p className="text-gray-700 leading-relaxed text-lg">
              {column.excerpt}
            </p>
          </div>
        </div>
      </div>

      {/* 記事本文 */}
      <div className="bg-white rounded-xl shadow-sm p-8">
        <div
          className="prose prose-lg max-w-none text-gray-800 leading-relaxed"
          style={{
            fontSize: '18px',
            lineHeight: '1.8',
            fontFamily: 'system-ui, -apple-system, sans-serif'
          }}
          dangerouslySetInnerHTML={{
            __html: column.body || '<p>本文が読み込まれていません。</p>'
          }}
        />

        {/* 記事フッター */}
        <div className="mt-12 pt-8 border-t border-gray-100">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <button className="flex items-center space-x-2 px-6 py-3 bg-red-50 hover:bg-red-100 text-red-600 rounded-lg transition-colors font-medium">
                <Heart className="w-5 h-5" />
                <span>いいね</span>
                <span className="text-sm">({column.likes ?? 0})</span>
              </button>

              <button className="flex items-center space-x-2 px-6 py-3 bg-gray-50 hover:bg-gray-100 text-gray-600 rounded-lg transition-colors font-medium">
                <span>共有</span>
              </button>
            </div>

            <div className="text-sm text-gray-500">
              最終更新: {formatDate(column.updatedAt || column.createdAt, { monthFormat: 'long' })}
            </div>
          </div>
        </div>
      </div>
    </article>
  );
}

export default ColumnDetail;
