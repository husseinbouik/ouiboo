'use client';

import { useTheme } from 'next-themes';
import { Moon, Sun } from 'lucide-react';
import { useSyncExternalStore } from 'react';
import { cn } from '@ouiboo/ui/utils';

export function ThemeToggle({ isTransparent }: { isTransparent?: boolean }) {
  const { theme, setTheme } = useTheme();
  const mounted = useSyncExternalStore(
    () => () => undefined,
    () => true,
    () => false,
  );

  if (!mounted) return (
    <div className="w-9 h-9 rounded-xl bg-muted/20 animate-pulse" />
  );

  return (
    <button
      onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
      disabled={!mounted}
      className={cn(
        "w-9 h-9 rounded-xl flex items-center justify-center transition-all duration-300 relative overflow-hidden group hover:bg-foreground/5",
        isTransparent ? "text-white/80 hover:text-white" : "text-muted-foreground hover:text-foreground"
      )}
      title="Toggle theme"
      aria-label="Toggle theme"
    >
        <div className="relative w-5 h-5">
            <Sun className={cn("h-5 w-5 absolute inset-0 transition-all duration-500 text-amber-500", mounted && theme === 'dark' ? '-rotate-90 scale-0' : 'rotate-0 scale-100')} />
            <Moon className={cn("h-5 w-5 absolute inset-0 transition-all duration-500 text-blue-400", mounted && theme === 'dark' ? 'rotate-0 scale-100' : 'rotate-90 scale-0')} />
        </div>
    </button>
  );
}
