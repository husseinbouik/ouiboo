'use client';

import { useTheme } from 'next-themes';
import { Moon, Sun } from 'lucide-react';
import { useSyncExternalStore } from 'react';
import { useTranslation } from 'react-i18next';
import { cn } from '../utils';

export function ThemeToggle({ isTransparent, label }: { isTransparent?: boolean; label?: string }) {
  const { t } = useTranslation();
  // Session #3 P0-12 (#557): the aria label was a hardcoded English
  // default; it now comes from the host app's common namespace (an
  // explicit label prop still wins; apps without the key keep English).
  const effectiveLabel = label ?? t('common.toggleTheme', { defaultValue: 'Toggle theme' });
  const { resolvedTheme, setTheme } = useTheme();
  const mounted = useSyncExternalStore(
    () => () => undefined,
    () => true,
    () => false,
  );

  if (!mounted) {
    return <div className="w-9 h-9 rounded-xl bg-muted/20 animate-pulse" />;
  }

  const isDark = resolvedTheme === 'dark';

  return (
    <button
      type="button"
      onClick={() => setTheme(isDark ? 'light' : 'dark')}
      className={cn(
        'w-9 h-9 rounded-xl flex items-center justify-center transition-all duration-300 relative group hover:bg-foreground/5 hit-slop',
        isTransparent
          ? 'text-white/80 hover:text-white'
          : 'text-muted-foreground hover:text-foreground',
      )}
      title={effectiveLabel}
      aria-label={effectiveLabel}
    >
      <div className="relative w-5 h-5">
        <Sun
          className={cn(
            'h-5 w-5 absolute inset-0 transition-all duration-500 text-amber-500',
            isDark ? '-rotate-90 scale-0' : 'rotate-0 scale-100',
          )}
        />
        <Moon
          className={cn(
            'h-5 w-5 absolute inset-0 transition-all duration-500 text-blue-400',
            isDark ? 'rotate-0 scale-100' : 'rotate-90 scale-0',
          )}
        />
      </div>
    </button>
  );
}