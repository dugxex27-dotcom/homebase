import { ReactNode } from 'react';
import { cn } from "@/lib/utils";

export function WorkspaceHeader({ 
  title, 
  subtitle, 
  action,
  children
}: { 
  title: string; 
  subtitle?: string; 
  action?: ReactNode; 
  children?: ReactNode;
}) {
  return (
    <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
      <div className="mx-auto flex w-full max-w-[1400px] flex-col items-start gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between md:px-6 md:py-4 lg:px-8">
        <div className="min-w-0 flex-1">
          <h1 className="text-xl md:text-2xl font-extrabold text-gray-900 tracking-tight truncate">
            {title}
          </h1>
          {subtitle && (
            <p className="truncate text-xs font-medium text-gray-500 md:text-sm mt-0.5">
              {subtitle}
            </p>
          )}
        </div>
        {action && (
          <div className="flex w-full flex-shrink-0 items-center gap-2 [&>*]:w-full sm:w-auto sm:[&>*]:w-auto">
            {action}
          </div>
        )}
      </div>
      {children && (
        <div className="mx-auto w-full max-w-[1400px] px-4 md:px-6 lg:px-8">
          {children}
        </div>
      )}
    </div>
  );
}

export function WorkspaceContent({ children, className }: { children?: ReactNode; className?: string }) {
  return (
    <main className={cn("mx-auto w-full max-w-[1400px] min-w-0 space-y-6 px-4 py-6 sm:px-6 lg:px-8 lg:py-8", className)}>
      {children}
    </main>
  );
}
