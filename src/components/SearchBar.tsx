'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Search, X, Hash } from 'lucide-react';
import { TagChip } from './ui/TagChip';
import { useFetch } from '@/lib/api';
import { Tag } from '@/types/Tag';

interface SearchBarProps {
  onSearch?: (query: string) => void;
  placeholder?: string;
  enableTagSearch?: boolean;
}

interface TagSearchResponse {
  data: { tags: Tag[] };
}

export function SearchBar({ 
  onSearch, 
  placeholder,
  enableTagSearch = true 
}: SearchBarProps) {
  const [query, setQuery] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);

  // タグ検索（デバウンス付き）
  const [debouncedQuery, setDebouncedQuery] = useState('');
  
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(query);
    }, 300);
    
    return () => clearTimeout(timer);
  }, [query]);

  const { data: tagResponse } = useFetch<TagSearchResponse>(
    enableTagSearch && debouncedQuery.length >= 2 
      ? `/api/tags/search?q=${encodeURIComponent(debouncedQuery)}`
      : null
  );

  const tagSuggestions = tagResponse?.data?.tags || [];

  const handleSearch = useCallback((value: string) => {
    setQuery(value);
    setSelectedIndex(-1);
    onSearch?.(value);
    
    if (value.length >= 2) {
      setShowSuggestions(true);
    } else {
      setShowSuggestions(false);
    }
  }, [onSearch]);

  const clearSearch = useCallback(() => {
    setQuery('');
    setShowSuggestions(false);
    setSelectedIndex(-1);
    onSearch?.('');
  }, [onSearch]);

  const handleTagSelect = useCallback((tag: Tag) => {
    setQuery('');
    setShowSuggestions(false);
    setSelectedIndex(-1);
    router.push(`/search/${tag.id}`);
  }, [router]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (!showSuggestions || tagSuggestions.length === 0) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(prev => 
          prev < tagSuggestions.length - 1 ? prev + 1 : -1
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(prev => 
          prev > -1 ? prev - 1 : tagSuggestions.length - 1
        );
        break;
      case 'Enter':
        e.preventDefault();
        if (selectedIndex >= 0 && tagSuggestions[selectedIndex]) {
          handleTagSelect(tagSuggestions[selectedIndex]);
        } else if (query.startsWith('#')) {
          // ハッシュタグ検索
          const tagName = query.slice(1);
          if (tagName) {
            router.push(`/search/${encodeURIComponent(tagName)}`);
          }
        }
        break;
      case 'Escape':
        setShowSuggestions(false);
        setSelectedIndex(-1);
        inputRef.current?.blur();
        break;
    }
  }, [showSuggestions, tagSuggestions, selectedIndex, handleTagSelect, query, router]);

  // 外部クリックで候補を閉じる
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        inputRef.current && 
        !inputRef.current.contains(event.target as Node) &&
        suggestionsRef.current &&
        !suggestionsRef.current.contains(event.target as Node)
      ) {
        setShowSuggestions(false);
        setSelectedIndex(-1);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // 画面サイズに応じてプレースホルダーを調整（SSR対応）
  const [dynamicPlaceholder, setDynamicPlaceholder] = useState("作品を検索...");
  
  useEffect(() => {
    const updatePlaceholder = () => {
      if (placeholder) {
        setDynamicPlaceholder(placeholder);
      } else {
        const baseText = enableTagSearch ? "作品・タグを検索..." : "作品を検索...";
        setDynamicPlaceholder(window.innerWidth < 640 ? "検索..." : baseText);
      }
    };
    
    updatePlaceholder();
    window.addEventListener('resize', updatePlaceholder);
    return () => window.removeEventListener('resize', updatePlaceholder);
  }, [placeholder, enableTagSearch]);

  return (
    <div className="w-full max-w-xl mx-auto relative">
      <div className="relative">
        <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-muted-foreground" size={18} />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => handleSearch(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={dynamicPlaceholder}
          className="w-full pl-12 pr-12 py-1.5 bg-background border border-border rounded-lg focus:outline-none focus:ring-0 focus:border-primary transition-colors text-sm font-medium placeholder:text-muted-foreground"
        />
        {query && (
          <button
            onClick={clearSearch}
            className="absolute right-4 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors p-1 rounded-full hover:bg-muted"
          >
            <X size={16} />
          </button>
        )}
      </div>

      {/* タグ検索候補 */}
      {showSuggestions && enableTagSearch && tagSuggestions.length > 0 && (
        <div 
          ref={suggestionsRef}
          className="absolute top-full left-0 right-0 mt-1 bg-background border border-border rounded-lg shadow-lg z-50 max-h-64 overflow-y-auto"
        >
          <div className="p-2 border-b border-border">
            <div className="flex items-center space-x-2 text-sm text-muted-foreground">
              <Hash size={14} />
              <span>タグ検索候補</span>
            </div>
          </div>
          
          {tagSuggestions.map((tag, index) => (
            <button
              key={tag.id}
              onClick={() => handleTagSelect(tag)}
              className={`w-full text-left p-3 hover:bg-muted transition-colors flex items-center justify-between ${
                index === selectedIndex ? 'bg-muted' : ''
              }`}
            >
              <div className="flex items-center space-x-2">
                <Hash size={14} className="text-muted-foreground" />
                <span>{tag.name}</span>
                {tag.isOfficial && (
                  <span className="bg-blue-100 text-blue-800 text-xs px-1.5 py-0.5 rounded-full font-medium">
                    公式
                  </span>
                )}
              </div>
              <span className="text-xs text-muted-foreground">
                {tag.count.toLocaleString()}件
              </span>
            </button>
          ))}
        </div>
      )}

      {enableTagSearch && (
        <div className="mt-2 text-xs text-muted-foreground">
          ヒント: # を付けてタグ検索、通常の文字で作品検索
        </div>
      )}
    </div>
  );
}