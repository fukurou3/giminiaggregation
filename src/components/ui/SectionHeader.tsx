import React, { ReactNode } from 'react';
import { LucideIcon } from 'lucide-react';

interface SectionHeaderProps {
  icon: LucideIcon;
  iconGradient?: {
    from: string;
    to: string;
  };
  title: string;
  titleSize?: 'sm' | 'md' | 'lg' | 'xl';
  description?: string;
  rightElement?: ReactNode;
  loading?: boolean;
}

export function SectionHeader({
  icon: Icon,
  iconGradient = { from: 'blue-500', to: 'purple-500' },
  title,
  titleSize = 'md',
  description,
  rightElement,
  loading = false
}: SectionHeaderProps) {
  const titleSizeClasses = {
    sm: 'text-lg',
    md: 'text-xl', 
    lg: 'text-2xl',
    xl: 'text-3xl'
  };

  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center space-x-3">
        <div className={`p-2 bg-gradient-to-br from-${iconGradient.from} to-${iconGradient.to} rounded-xl`}>
          <Icon className="w-6 h-6 text-white" />
        </div>
        <div>
          <h2 className={`${titleSizeClasses[titleSize]} font-bold text-foreground`}>
            {title}
          </h2>
          {description && (
            <p className="text-muted-foreground">{description}</p>
          )}
        </div>
      </div>
      
      {!loading && rightElement}
      {loading && <div className="w-20 h-6 bg-muted animate-pulse rounded"></div>}
    </div>
  );
}