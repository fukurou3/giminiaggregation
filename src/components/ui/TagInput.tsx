"use client";

import { useState, KeyboardEvent } from "react";
import { X } from "lucide-react";

interface TagInputProps {
  tags: string[];
  onTagsChange: (tags: string[]) => void;
  maxTags?: number;
  placeholder?: string;
  className?: string;
}

export function TagInput({
  tags,
  onTagsChange,
  maxTags = 5,
  placeholder = "タグを入力してEnterキーで追加",
  className = "",
}: TagInputProps) {
  const [inputValue, setInputValue] = useState("");

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      addTag();
    } else if (e.key === "Backspace" && inputValue === "" && tags.length > 0) {
      removeTag(tags.length - 1);
    }
  };

  const addTag = () => {
    const trimmedValue = inputValue.trim();
    if (
      trimmedValue &&
      !tags.includes(trimmedValue) &&
      tags.length < maxTags &&
      trimmedValue.length <= 20
    ) {
      onTagsChange([...tags, trimmedValue]);
      setInputValue("");
    }
  };

  const removeTag = (index: number) => {
    const newTags = tags.filter((_, i) => i !== index);
    onTagsChange(newTags);
  };

  return (
    <div className={`space-y-2 ${className}`}>
      <div className="flex flex-wrap gap-2 p-3 bg-input border border-input-border rounded-md min-h-[42px] focus-within:ring-2 focus-within:ring-ring">
        {tags.map((tag, index) => (
          <span
            key={index}
            className="inline-flex items-center gap-1 px-2 py-1 bg-primary/10 text-primary rounded-md text-sm"
          >
            {tag}
            <button
              type="button"
              onClick={() => removeTag(index)}
              className="text-primary/70 hover:text-primary transition-colors"
            >
              <X className="h-3 w-3" />
            </button>
          </span>
        ))}
        {tags.length < maxTags && (
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            onBlur={addTag}
            placeholder={tags.length === 0 ? placeholder : ""}
            className="flex-1 min-w-[120px] bg-transparent border-none outline-none text-input-foreground placeholder:text-muted-foreground"
            maxLength={20}
          />
        )}
      </div>
      
      <div className="flex justify-between text-sm text-muted-foreground">
        <span>タグ: {tags.length}/{maxTags}</span>
        {inputValue.length > 0 && (
          <span className={inputValue.length > 20 ? "text-error" : ""}>
            {inputValue.length}/20文字
          </span>
        )}
      </div>
      
      {tags.length >= maxTags && (
        <p className="text-sm text-muted-foreground">
          最大{maxTags}個までのタグを追加できます
        </p>
      )}
    </div>
  );
}