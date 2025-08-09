import React, { TextareaHTMLAttributes } from 'react';

interface AutosizeTextareaProps extends Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, 'onChange'> {
  value: string;
  onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  forbidEnter?: boolean;
  minHeight?: string;
}

export function AutosizeTextarea({ 
  value, 
  onChange, 
  forbidEnter = true, 
  minHeight = '42px',
  style = {},
  onKeyDown,
  ...props 
}: AutosizeTextareaProps) {
  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    // Call the parent's onChange first
    onChange(e);
    
    // Then handle auto-resize
    const target = e.target as HTMLTextAreaElement;
    target.style.height = minHeight;
    target.style.height = `${target.scrollHeight}px`;
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Handle Shift+Enter behavior
    if (forbidEnter && e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
    }
    
    // Call parent's onKeyDown if provided
    if (onKeyDown) {
      onKeyDown(e);
    }
  };

  return (
    <textarea
      {...props}
      value={value}
      onChange={handleChange}
      onKeyDown={handleKeyDown}
      style={{
        minHeight,
        resize: 'none',
        overflow: 'hidden',
        ...style,
      }}
    />
  );
}