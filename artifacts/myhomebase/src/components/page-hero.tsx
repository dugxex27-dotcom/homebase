import { ReactNode } from 'react';

interface PageHeroProps {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  action?: ReactNode;
}

export function PageHero({ eyebrow, title, subtitle, action }: PageHeroProps) {
  return (
    <div className="bg-white border-b border-gray-200 px-4 py-3 md:px-6 md:py-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
      <div>
        {eyebrow && (
          <div className="text-[10px] font-bold text-gray-500 tracking-widest uppercase mb-1">
            {eyebrow}
          </div>
        )}
        <h1 className="text-xl md:text-2xl font-extrabold text-[#2C0F5B] tracking-tight">
          {title}
        </h1>
        {subtitle && (
          <p className="text-xs md:text-sm text-gray-500 font-medium mt-0.5">
            {subtitle}
          </p>
        )}
      </div>
      {action && (
        <div className="flex-shrink-0">
          {action}
        </div>
      )}
    </div>
  );
}
