'use client';

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { TagChip } from './TagChip';
import { TagModal } from './TagModal';
import { Tag } from '@/types/Tag';
import { generateTagId } from '@/lib/tags';

interface TagMeasurement {
  id: string;
  width: number;
  tag: Tag;
}

interface PackedRow {
  tags: Tag[];
  width: number;
}

// +N擬似タグの作成
const createPlusNTag = (count: number): Tag => {
  // 安全性チェック
  const safeCount = Math.max(0, Math.floor(count || 0));
  return {
    id: `__plus-n-${safeCount}`,
    name: `+${safeCount}`,
    aliases: [],
    count: 0,
    isOfficial: false,
    views: 0,
    favorites: 0,
    flagged: false,
    createdAt: new Date(),
    updatedAt: new Date()
  };
};

// +N擬似タグを最終行に追加する関数
const addPlusNToRows = (rows: Tag[][], hiddenCount: number, maxWidth: number, gap: number, plusNWidth: number, measurements: TagMeasurement[]): Tag[][] => {
  // 安全性チェック
  if (!rows || hiddenCount <= 0 || rows.length === 0 || !measurements || measurements.length === 0) {
    return rows || [];
  }
  
  const lastRowIndex = rows.length - 1;
  const lastRow = [...(rows[lastRowIndex] || [])];
  const plusNTag = createPlusNTag(hiddenCount);
  
  // 最終行の現在の幅を計算
  let currentWidth = 0;
  for (let i = 0; i < lastRow.length; i++) {
    const tagMeasurement = measurements.find(m => m.tag.id === lastRow[i].id);
    if (tagMeasurement) {
      currentWidth += (i > 0 ? gap : 0) + tagMeasurement.width;
    } else {
      // measurementが見つからない場合は推定値を使用
      const estimatedWidth = 60; // デフォルトタグ幅の推定
      currentWidth += (i > 0 ? gap : 0) + estimatedWidth;
    }
  }
  
  // +Nタグが入るかチェック
  const gapForPlusN = lastRow.length > 0 ? gap : 0;
  const requiredWidth = currentWidth + gapForPlusN + plusNWidth;
  
  if (requiredWidth <= maxWidth) {
    // 入る場合：末尾に追加
    lastRow.push(plusNTag);
  } else if (lastRow.length > 0) {
    // 入らない場合：最後のタグと置換
    lastRow[lastRow.length - 1] = plusNTag;
  } else {
    // 最終行が空の場合：そのまま追加
    lastRow.push(plusNTag);
  }
  
  const updatedRows = [...rows];
  updatedRows[lastRowIndex] = lastRow;
  return updatedRows;
};

interface HorizontalTagListProps {
  tags: (Tag | string)[];
  maxRows?: number;
  gap?: number;
  className?: string;
  postTitle?: string;
  tagProps?: {
    size?: 'sm' | 'md' | 'lg';
    variant?: 'default' | 'outlined' | 'ghost';
    showIcon?: boolean;
    showStats?: boolean;
  };
  onPlusNClick?: (hiddenTags: (Tag | string)[]) => void;
  fillHeight?: boolean;
}

export function HorizontalTagList({
  tags,
  maxRows = 2,
  gap = 8,
  className = '',
  postTitle,
  tagProps = {},
  onPlusNClick,
  fillHeight = false
}: HorizontalTagListProps) {
  // 文字列タグを事前にID化（安定キー確保）
  const normalizedTags = useMemo(() => {
    return tags.map(tag => {
      if (typeof tag === 'string') {
        return {
          id: generateTagId(tag),
          name: tag,
          aliases: [],
          count: 0,
          isOfficial: false,
          views: 0,
          favorites: 0,
          flagged: false,
          createdAt: new Date(),
          updatedAt: new Date()
        } as Tag;
      }
      return tag;
    });
  }, [tags]);

  const containerRef = useRef<HTMLDivElement>(null);
  const measureRef = useRef<HTMLDivElement>(null);
  const [measurements, setMeasurements] = useState<TagMeasurement[]>([]);
  const [packedResult, setPackedResult] = useState<{
    rows: Tag[][];
    hiddenCount: number;
  }>({ rows: [], hiddenCount: 0 });
  const [containerWidth, setContainerWidth] = useState(0);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isInitialMeasuring, setIsInitialMeasuring] = useState(true);
  const [plusNWidth, setPlusNWidth] = useState(60); // 初期値は60、実測後更新

  // +N幅を実測する関数
  const measurePlusNWidth = useCallback(() => {
    if (!measureRef.current) return;
    
    // "+99"相当のTagChipを不可視でレンダリングして幅測定
    const tempContainer = document.createElement('div');
    tempContainer.style.position = 'absolute';
    tempContainer.style.visibility = 'hidden';
    tempContainer.style.pointerEvents = 'none';
    
    measureRef.current.appendChild(tempContainer);
    
    // React要素を一時的にレンダリングはできないので、DOMで直接作成
    const tempElement = document.createElement('span');
    const size = tagProps.size || 'md';
    const sizeClasses = {
      sm: 'text-xs px-2 py-1',
      md: 'text-sm px-3 py-1.5', 
      lg: 'text-base px-4 py-2'
    };
    
    tempElement.className = `inline-flex items-center space-x-1 rounded-full font-medium transition-colors bg-transparent text-muted-foreground hover:bg-muted hover:text-foreground cursor-pointer ${sizeClasses[size]}`;
    tempElement.textContent = '+99';
    
    tempContainer.appendChild(tempElement);
    
    const rect = tempElement.getBoundingClientRect();
    const measuredWidth = rect.width;
    
    measureRef.current.removeChild(tempContainer);
    
    setPlusNWidth(measuredWidth);
  }, [tagProps.size]);

  // タグの幅を測定（実際のTagChipスタイルを完全反映）
  const measureTags = useCallback(async () => {
    if (!measureRef.current || normalizedTags.length === 0) return;

    // まず+N幅を測定
    if (!measureRef.current) return;
    
    // "+99"相当のTagChipを不可視でレンダリングして幅測定
    const tempContainer = document.createElement('div');
    tempContainer.style.position = 'absolute';
    tempContainer.style.visibility = 'hidden';
    tempContainer.style.pointerEvents = 'none';
    
    measureRef.current.appendChild(tempContainer);
    
    // React要素を一時的にレンダリングはできないので、DOMで直接作成
    const tempElement = document.createElement('span');
    const size = tagProps.size || 'md';
    const sizeClasses = {
      sm: 'text-xs px-2 py-1',
      md: 'text-sm px-3 py-1.5', 
      lg: 'text-base px-4 py-2'
    };
    
    tempElement.className = `inline-flex items-center space-x-1 rounded-full font-medium transition-colors bg-transparent text-muted-foreground hover:bg-muted hover:text-foreground cursor-pointer ${sizeClasses[size]}`;
    tempElement.textContent = '+99';
    
    tempContainer.appendChild(tempElement);
    
    const rect = tempElement.getBoundingClientRect();
    const measuredWidth = rect.width;
    
    measureRef.current.removeChild(tempContainer);
    
    setPlusNWidth(measuredWidth);

    const newMeasurements: TagMeasurement[] = [];
    
    // 各タグの幅を測定
    for (const tag of normalizedTags) {
      const tagId = tag.id;
      
      // 測定用の一時的な要素を作成
      const tempTagElement = document.createElement('span');
      tempTagElement.style.position = 'absolute';
      tempTagElement.style.visibility = 'hidden';
      tempTagElement.style.pointerEvents = 'none';
      
      // TagChipと完全に同じスタイルを適用
      const variantClasses = {
        default: 'bg-primary/10 text-primary border border-primary/20',
        outlined: 'bg-transparent text-foreground border border-border',
        ghost: 'bg-transparent text-muted-foreground'
      };
      
      const variant = tagProps.variant || 'default';
      
      // TagChipと完全一致のクラスを適用（transition-colorsも含める）
      tempTagElement.className = `inline-flex items-center space-x-1 rounded-full font-medium transition-colors ${sizeClasses[size]} ${variantClasses[variant]}`;
      
      const tagName = tag.name;
      const hasIcon = tagProps.showIcon !== false;
      
      // アイコンとテキストを含めた要素構造を作成
      let content = '';
      if (hasIcon) {
        const iconSize = size === 'sm' ? 12 : size === 'md' ? 14 : 16;
        // より正確なアイコンサイズを模擬（Lucide Reactアイコンのサイズ）
        content += `<svg width="${iconSize}" height="${iconSize}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="flex-shrink-0" style="width: ${iconSize}px; height: ${iconSize}px;"><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"></path><line x1="4" x2="4" y1="22" y2="15"></line></svg>`;
      }
      content += `<span class="truncate" style="white-space: nowrap; word-break: keep-all; overflow: hidden; text-overflow: ellipsis; max-width: 9999px;">${tagName}</span>`;
      
      tempTagElement.innerHTML = content;
      
      measureRef.current.appendChild(tempTagElement);
      
      // 実際の幅を取得
      const tagRect = tempTagElement.getBoundingClientRect();
      const totalWidth = tagRect.width;
      
      measureRef.current.removeChild(tempTagElement);
      
      newMeasurements.push({
        id: tagId,
        width: totalWidth,
        tag
      });
    }
    
    setMeasurements(newMeasurements);
  }, [normalizedTags, tagProps.size, tagProps.variant, tagProps.showIcon, containerWidth]);

  // 初期測定とリサイズ時の再測定
  const [rafId, setRafId] = useState<number | null>(null);
  
  const scheduleUpdate = useCallback(() => {
    setRafId(prevRafId => {
      if (prevRafId) {
        cancelAnimationFrame(prevRafId);
      }
      
      const newRafId = requestAnimationFrame(async () => {
        await measureTags();
        setIsInitialMeasuring(false); // 初回測定完了
        setRafId(null);
      });
      
      return newRafId;
    });
  }, [measureTags]);

  // コンテナサイズの監視
  useEffect(() => {
    if (!containerRef.current) return;

    const resizeObserver = new ResizeObserver(entries => {
      const entry = entries[0];
      if (entry) {
        const newWidth = entry.contentRect.width;
        setContainerWidth(newWidth);
        // サイズ変更時も再測定をスケジュール
        scheduleUpdate();
      }
    });

    resizeObserver.observe(containerRef.current);
    
    return () => resizeObserver.disconnect();
  }, [scheduleUpdate]);

  useEffect(() => {
    if (normalizedTags.length > 0) {
      scheduleUpdate();
    }
    
    return () => {
      setRafId(prevRafId => {
        if (prevRafId) {
          cancelAnimationFrame(prevRafId);
        }
        return null;
      });
    };
  }, [normalizedTags, scheduleUpdate]);


  // 改良版行優先パッキング（1段目優先＋正確な+N計算）
  const performRowFirstPacking = useCallback((
    measurements: TagMeasurement[],
    maxWidth: number,
    maxRows: number,
    gap: number,
    plusNWidth: number
  ) => {
    const rows: PackedRow[] = [];
    const usedTags = new Set<string>();
    
    // 各行を上から順番に埋める
    for (let rowIndex = 0; rowIndex < maxRows; rowIndex++) {
      const currentRow: PackedRow = { tags: [], width: 0 };
      const isLastRow = rowIndex === maxRows - 1;
      
      // 1段目は必ず何かを配置するため、配置可能なタグを優先的に探す
      if (rowIndex === 0 && usedTags.size === 0) {
        // 1段目: 最も小さいタグから順番に試す（必ず配置するため）
        const sortedForFirstRow = measurements
          .filter(m => !usedTags.has(m.tag.id))
          .sort((a, b) => a.width - b.width);
        
        for (const measurement of sortedForFirstRow) {
          const tagId = measurement.tag.id;
          const gapWidth = currentRow.tags.length > 0 ? gap : 0;
          
          // 1段目では+N幅は考慮しない（必ず埋めるため）
          const requiredWidth = currentRow.width + gapWidth + measurement.width;
          
          if (requiredWidth <= maxWidth) {
            currentRow.tags.push(measurement.tag);
            currentRow.width += gapWidth + measurement.width;
            usedTags.add(tagId);
          }
        }
      } else {
        // 2段目以降: 元の順序を保持して配置
        for (const measurement of measurements) {
          const tagId = measurement.tag.id;
          if (usedTags.has(tagId)) continue;
          
          const gapWidth = currentRow.tags.length > 0 ? gap : 0;
          
          // このタグを入れた後に残りタグがあるかチェック
          const remainingTagsAfter = measurements.filter(m => {
            const mId = m.tag.id;
            return !usedTags.has(mId) && mId !== tagId;
          });
          
          // 最後の行で残りがある場合のみ+N幅を見込む
          const willHaveHiddenTags = isLastRow && remainingTagsAfter.length > 0;
          const plusNWidthNeeded = willHaveHiddenTags ? gap + plusNWidth : 0;
          
          const requiredWidth = currentRow.width + gapWidth + measurement.width + plusNWidthNeeded;
          
          if (requiredWidth <= maxWidth) {
            currentRow.tags.push(measurement.tag);
            currentRow.width += gapWidth + measurement.width;
            usedTags.add(tagId);
          }
        }
      }
      
      if (currentRow.tags.length > 0) {
        rows.push(currentRow);
      } else {
        // この行に何も配置できない場合は終了
        break;
      }
    }
    
    const hiddenCount = measurements.length - usedTags.size;
    
    // +N擬似タグを最終行に追加
    const finalRows = addPlusNToRows(rows.map(row => row.tags), hiddenCount, maxWidth, gap, plusNWidth, measurements);
    
    return { rows: finalRows, hiddenCount };
  }, []);

  // 軽量FFD + Best-Fit パッキング
  const performFFDPacking = useCallback((
    measurements: TagMeasurement[],
    maxWidth: number,
    maxRows: number,
    gap: number,
    plusNWidth: number
  ) => {
    // First-Fit Decreasing: 幅の降順でソート
    const sortedMeasurements = [...measurements].sort((a, b) => b.width - a.width);
    const rows: PackedRow[] = [];
    const usedTags = new Set<string>();
    
    for (const measurement of sortedMeasurements) {
      let placed = false;
      
      // 既存の行に配置を試行
      for (let i = 0; i < rows.length; i++) {
        const gapWidth = rows[i].tags.length > 0 ? gap : 0;
        const remainingAfter = sortedMeasurements.filter(m => !usedTags.has(m.tag.id) && m.tag.id !== measurement.tag.id);
        const isLastRow = i === maxRows - 1;
        const willHaveHidden = isLastRow && remainingAfter.length > 0;
        const plusNWidthNeeded = willHaveHidden ? gap + plusNWidth : 0;
        
        if (rows[i].width + gapWidth + measurement.width + plusNWidthNeeded <= maxWidth) {
          rows[i].tags.push(measurement.tag);
          rows[i].width += gapWidth + measurement.width;
          usedTags.add(measurement.tag.id);
          placed = true;
          break;
        }
      }
      
      // 新しい行に配置
      if (!placed && rows.length < maxRows) {
        const remainingAfter = sortedMeasurements.filter(m => !usedTags.has(m.tag.id) && m.tag.id !== measurement.tag.id);
        const isLastRow = rows.length === maxRows - 1;
        const willHaveHidden = isLastRow && remainingAfter.length > 0;
        const plusNWidthNeeded = willHaveHidden ? gap + plusNWidth : 0;
        
        if (measurement.width + plusNWidthNeeded <= maxWidth) {
          rows.push({ tags: [measurement.tag], width: measurement.width });
          usedTags.add(measurement.tag.id);
        }
      }
    }
    
    // Best-Fit微調整: 未配置のタグを最適な行に配置
    const unusedTags = measurements.filter(m => !usedTags.has(m.tag.id));
    
    // 小さなタグから順番に最適配置を試行
    unusedTags.sort((a, b) => a.width - b.width);
    
    for (const measurement of unusedTags) {
      let bestRowIndex = -1;
      let bestRemainingSpace = -1;
      
      for (let i = 0; i < rows.length; i++) {
        const gapWidth = gap;
        const isLastRow = i === maxRows - 1;
        const remainingAfterPlacement = unusedTags.filter(m => 
          !usedTags.has(m.tag.id) && m.tag.id !== measurement.tag.id
        );
        const plusNWidthNeeded = isLastRow && remainingAfterPlacement.length > 0 ? gap + plusNWidth : 0;
        
        const requiredWidth = rows[i].width + gapWidth + measurement.width + plusNWidthNeeded;
        const remainingSpace = maxWidth - requiredWidth;
        
        if (remainingSpace >= 0 && remainingSpace > bestRemainingSpace) {
          bestRemainingSpace = remainingSpace;
          bestRowIndex = i;
        }
      }
      
      if (bestRowIndex >= 0) {
        rows[bestRowIndex].tags.push(measurement.tag);
        rows[bestRowIndex].width += gap + measurement.width;
        usedTags.add(measurement.tag.id);
      }
    }
    
    const hiddenCount = measurements.length - usedTags.size;
    
    // +N擬似タグを最終行に追加
    const finalRows = addPlusNToRows(rows.map(row => row.tags), hiddenCount, maxWidth, gap, plusNWidth, measurements);
    
    return { rows: finalRows, hiddenCount };
  }, []);

  // パッキングアルゴリズム
  const packTags = useCallback(() => {
    if (!containerWidth || measurements.length === 0) {
      return { rows: [], hiddenCount: 0 };
    }

    const maxWidth = containerWidth;
    
    // FFD + Best-Fitアプローチ
    const ffdResult = performFFDPacking(measurements, maxWidth, maxRows, gap, plusNWidth);
    
    // 行優先（元順序保持）アプローチ
    const rowFirstResult = performRowFirstPacking(measurements, maxWidth, maxRows, gap, plusNWidth);
    
    // より多くのタグを表示できる方を選択
    const ffdVisibleCount = ffdResult.rows.reduce((sum, row) => sum + row.length, 0);
    const rowFirstVisibleCount = rowFirstResult.rows.reduce((sum, row) => sum + row.length, 0);
    
    return ffdVisibleCount >= rowFirstVisibleCount ? ffdResult : rowFirstResult;
  }, [measurements, containerWidth, maxRows, gap, plusNWidth, performFFDPacking, performRowFirstPacking]);

  // パッキング結果の更新（浅い比較で不要な更新を防ぐ）
  useEffect(() => {
    const result = packTags();
    
    // 結果が変わっていない場合はsetStateしない
    setPackedResult(prevResult => {
      if (
        prevResult.rows.length === result.rows.length &&
        prevResult.hiddenCount === result.hiddenCount &&
        prevResult.rows.every((row, rowIndex) => 
          row.length === result.rows[rowIndex]?.length &&
          row.every((tag, tagIndex) => tag.id === result.rows[rowIndex]?.[tagIndex]?.id)
        )
      ) {
        return prevResult; // 変更なしの場合は前の状態を返す
      }
      return result;
    });
  }, [packTags]);

  const hiddenTags = React.useMemo(() => {
    const visibleTagIds = new Set(
      packedResult.rows.flat()
        .filter(tag => !tag.id.startsWith('__plus-n-')) // +N擬似タグを除外
        .map(tag => tag.id)
    );
    return normalizedTags.filter(tag => !visibleTagIds.has(tag.id));
  }, [normalizedTags, packedResult.rows]);

  const handlePlusNClick = useCallback((event?: React.MouseEvent) => {
    // イベント伝播を停止して親要素のクリックイベントを防ぐ
    if (event) {
      event.stopPropagation();
    }
    
    if (onPlusNClick && packedResult.hiddenCount > 0) {
      onPlusNClick(hiddenTags);
    } else {
      // デフォルトの動作：モーダルを開く
      setIsModalOpen(true);
    }
  }, [onPlusNClick, packedResult, hiddenTags]);

  return (
    <div className={`relative ${className}`}>
      {/* 測定用の不可視要素 */}
      <div 
        ref={measureRef}
        className="absolute top-0 left-0 pointer-events-none opacity-0"
        aria-hidden="true"
      />
      
      {/* 実際のタグ表示 - 行ごとに分離 */}
      <div 
        ref={containerRef}
        className={`flex flex-col ${fillHeight ? 'h-full justify-end' : ''}`}
        style={{ 
          visibility: isInitialMeasuring ? 'hidden' : 'visible',
          height: isInitialMeasuring 
            ? `${maxRows * 28}px` 
            : (fillHeight ? '100%' : 'auto')
        }}
      >
        {packedResult.rows.map((row, rowIndex) => {
          return (
            <div 
              key={`row-${rowIndex}`} 
              className="flex flex-wrap items-center"
              style={{ gap: `${gap}px`, marginBottom: rowIndex < packedResult.rows.length - 1 ? '2px' : '0' }}
            >
              {row.map((tag, tagIndex) => {
                const isPlusNTag = tag.id.startsWith('__plus-n-');
                
                // 行の余白計算
                let usedWidth = 0;
                let lastNormalIndex = -1;
                
                // 各タグの実測幅を合計
                for (let i = 0; i < row.length; i++) {
                  const currentTag = row[i];
                  const currentIsPlusN = currentTag.id.startsWith('__plus-n-');
                  
                  if (!currentIsPlusN) {
                    lastNormalIndex = i; // 最後の通常タグのインデックス
                  }
                  
                  if (currentIsPlusN) {
                    // +Nタグの幅
                    usedWidth += (i > 0 ? gap : 0) + plusNWidth;
                  } else {
                    // 通常タグの実測幅
                    const measurement = measurements.find(m => m.tag.id === currentTag.id);
                    const tagWidth = measurement ? measurement.width : 60; // フォールバック
                    usedWidth += (i > 0 ? gap : 0) + tagWidth;
                  }
                }
                
                // 余白計算
                const leftover = Math.max(0, containerWidth - usedWidth);
                const isLastNormal = tagIndex === lastNormalIndex;
                
                // 最後の通常タグにだけ余白を配分
                let textMaxWidthPx: number | undefined;
                if (isLastNormal && leftover > 0) {
                  const measurement = measurements.find(m => m.tag.id === tag.id);
                  const baseWidth = measurement ? measurement.width : 60;
                  textMaxWidthPx = baseWidth + leftover;
                }
                
                return (
                  <div key={tag.id} className="flex-shrink-0">
                    <TagChip
                      tag={tag}
                      size={tagProps.size}
                      variant={isPlusNTag ? "ghost" : tagProps.variant}
                      showIcon={isPlusNTag ? false : tagProps.showIcon}
                      showStats={tagProps.showStats}
                      maxWidth={!textMaxWidthPx ? containerWidth : undefined} // 新版使用時は従来版無効
                      textMaxWidthPx={textMaxWidthPx}
                      clickable={!isPlusNTag}
                      onClick={isPlusNTag ? handlePlusNClick : undefined}
                      className={`whitespace-nowrap ${isPlusNTag ? 'cursor-pointer' : ''}`}
                      title={tag.name} // ホバーでフル文字列表示
                    />
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>

      {/* タグモーダル */}
      <TagModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        tags={normalizedTags}
        postTitle={postTitle}
        tagProps={tagProps}
      />
    </div>
  );
}