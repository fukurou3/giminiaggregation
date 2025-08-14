/**
 * カスタムセクションデータを処理して最終的な形式に変換
 */
export function processCustomSections(
  customSections: { id: string; title: string }[] | undefined,
  customSectionData: { [key: string]: string } | undefined
): Array<{ id: string; title: string; content: string }> | undefined {
  if (!customSections || !customSectionData) {
    return undefined;
  }

  return customSections
    .filter(section => customSectionData[section.id]?.trim()) // 内容があるもののみ
    .map(section => ({
      id: section.id,
      title: section.title,
      content: customSectionData[section.id].trim()
    }));
}