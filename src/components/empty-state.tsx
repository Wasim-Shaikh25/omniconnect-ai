'use client';

import { ReactNode } from 'react';
import { LucideIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  children?: ReactNode;
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  children,
}: EmptyStateProps) {
  return (
    <div className="empty-state">
      {Icon && (
        <div className="empty-state-icon">
          <Icon className="mx-auto h-12 w-12 text-muted-foreground" />
        </div>
      )}
      <div className="space-y-2">
        <h3 className="empty-state-title">{title}</h3>
        {description && (
          <p className="empty-state-description">{description}</p>
        )}
      </div>
      {action && (
        <Button
          onClick={action.onClick}
          className="mt-2"
        >
          {action.label}
        </Button>
      )}
      {children}
    </div>
  );
}
