import React, { cloneElement, ReactElement, ReactNode } from 'react';

interface FieldProps {
  id: string;
  label: string;
  required?: boolean;
  help?: string;
  error?: string;
  children: ReactNode;
}

export function Field({ id, label, required, help, error, children }: FieldProps) {
  const helpId = help ? `${id}-help` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  
  const describedBy = [helpId, errorId].filter(Boolean).join(' ') || undefined;
  
  // Try to enhance children with accessibility attributes if it's a simple element
  let enhancedChildren;
  try {
    // Only clone if children is a simple React element (not a complex structure)
    if (React.isValidElement(children) && typeof children.type === 'string') {
      enhancedChildren = cloneElement(children, {
        'aria-invalid': !!error,
        'aria-describedby': describedBy,
      });
    } else {
      // For complex children, render as-is
      enhancedChildren = children;
    }
  } catch {
    // Fallback: render children as-is if cloning fails
    enhancedChildren = children;
  }

  return (
    <div>
      <label htmlFor={id} className="block text-base font-medium text-foreground mb-2">
        {label}
        {required && <span className="text-error"> *</span>}
        {help && (
          <span id={helpId} className="text-sm font-normal text-muted-foreground ml-2">：{help}</span>
        )}
      </label>
      {enhancedChildren}
      {error && (
        <p id={errorId} className="text-error text-sm mt-1">
          {error}
        </p>
      )}
    </div>
  );
}