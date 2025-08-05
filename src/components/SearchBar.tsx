'use client';

import { useState, useCallback, useEffect } from 'react';
import { Search, X } from 'lucide-react';

interface SearchBarProps {
  onSearch?: (query: string) => void;
  placeholder?: string;
}

export function SearchBar({ onSearch, placeholder }: SearchBarProps) {
  const [query, setQuery] = useState('');

  const handleSearch = useCallback((value: string) => {
    setQuery(value);
    onSearch?.(value);
  }, [onSearch]);

  const clearSearch = useCallback(() => {
    setQuery('');
    onSearch?.('');
  }, [onSearch]);

  // 画面サイズに応じてプレースホルダーを調整（SSR対応）
  const [dynamicPlaceholder, setDynamicPlaceholder] = useState("作品を検索...");
  
  useEffect(() => {
    const updatePlaceholder = () => {
      if (placeholder) {
        setDynamicPlaceholder(placeholder);
      } else {
        setDynamicPlaceholder(window.innerWidth < 640 ? "検索..." : "作品を検索...");
      }
    };
    
    updatePlaceholder();
    window.addEventListener('resize', updatePlaceholder);
    return () => window.removeEventListener('resize', updatePlaceholder);
  }, [placeholder]);

  return (
    <div className="w-full max-w-xl mx-auto">
      <div className="relative">
        <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-muted-foreground" size={18} />
        <input
          type="text"
          value={query}
          onChange={(e) => handleSearch(e.target.value)}
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
    </div>
  );
}