'use client';

import { useState } from 'react';
import { Plus, X } from 'lucide-react';

interface DescriptionSectionSelectorProps {
  selectedSections: Set<string>;
  customSections: { id: string; title: string }[];
  onToggleSection: (section: string) => void;
  onRemoveCustomSection: (sectionId: string) => void;
  onAddCustomSection: (title: string) => void;
}

const PREDEFINED_SECTIONS = [
  { id: 'problemBackground', label: '課題・背景' },
  { id: 'useCase', label: '想定シーン・利用者' },
  { id: 'uniquePoints', label: '差別化ポイント' },
  { id: 'futureIdeas', label: '応用・発展アイデア' },
];

export function DescriptionSectionSelector({
  selectedSections,
  customSections,
  onToggleSection,
  onRemoveCustomSection,
  onAddCustomSection,
}: DescriptionSectionSelectorProps) {
  const [showAddForm, setShowAddForm] = useState(false);
  const [newSectionTitle, setNewSectionTitle] = useState('');

  const handleAddSection = () => {
    if (newSectionTitle.trim()) {
      onAddCustomSection(newSectionTitle.trim());
      setNewSectionTitle('');
      setShowAddForm(false);
    }
  };

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        作品をより詳しく紹介したい項目があれば、下記から選択してください。
      </p>

      {/* 選択ボタン群 */}
      <div className="flex flex-wrap gap-3">
        {/* 固定の4つのボタン */}
        {PREDEFINED_SECTIONS.map((section) => (
          <button
            key={section.id}
            type="button"
            onClick={() => onToggleSection(section.id)}
            className={`px-4 py-2 border rounded-md transition-colors font-medium ${
              selectedSections.has(section.id)
                ? 'bg-primary text-primary-foreground border-primary'
                : 'bg-muted/30 border-border hover:bg-muted/50 text-foreground'
            }`}
          >
            {section.label}
          </button>
        ))}

        {/* カスタムセクションのボタン */}
        {customSections.map((section) => (
          <div key={section.id} className="relative group">
            <button
              type="button"
              onClick={() => onToggleSection(section.id)}
              className={`px-4 py-2 border rounded-md transition-colors font-medium ${
                selectedSections.has(section.id)
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'bg-muted/30 border-border hover:bg-muted/50 text-foreground'
              }`}
            >
              {section.title}
            </button>
            <button
              type="button"
              onClick={() => onRemoveCustomSection(section.id)}
              className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center text-xs hover:bg-red-600 transition-colors opacity-0 group-hover:opacity-100"
              title="削除"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        ))}

        {/* 追加ボタン */}
        <button
          type="button"
          onClick={() => setShowAddForm(true)}
          className="px-4 py-2 border border-dashed border-border rounded-md hover:bg-muted/50 transition-colors font-medium text-muted-foreground hover:text-foreground flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          項目を追加
        </button>
      </div>

      {/* カスタムセクション追加フォーム */}
      {showAddForm && (
        <div className="mt-4 p-4 border border-border rounded-md bg-muted/20">
          <h4 className="font-medium text-foreground mb-3">新しい項目を追加</h4>
          <div className="space-y-3">
            <div>
              <label htmlFor="new-section-title" className="block text-sm font-medium text-foreground mb-1">
                項目名 <span className="text-error">*</span>
              </label>
              <input
                id="new-section-title"
                type="text"
                value={newSectionTitle}
                onChange={(e) => setNewSectionTitle(e.target.value)}
                placeholder="例：技術的課題、使用技術、開発期間など"
                className="w-full px-3 py-2 bg-input border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-ring text-input-foreground"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && newSectionTitle.trim()) {
                    handleAddSection();
                  }
                }}
              />
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleAddSection}
                disabled={!newSectionTitle.trim()}
                className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                追加
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowAddForm(false);
                  setNewSectionTitle('');
                }}
                className="px-4 py-2 bg-muted text-muted-foreground rounded-md hover:bg-muted/80 transition-colors"
              >
                キャンセル
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}