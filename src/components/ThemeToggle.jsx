/**
 * ThemeToggle.jsx — Theme Cycling Button
 *
 * A button component that cycles through three visual themes:
 * light → dark → sepia → light → ...
 *
 * Each theme applies a CSS class to the document root element which
 * activates the corresponding CSS custom properties and Tailwind variants.
 *
 * The component renders a context-appropriate icon for each theme:
 * - Light: Moon icon (switch to dark)
 * - Dark: Sun icon (switch to sepia)
 * - Sepia: Custom checkmark circle icon (switch to light)
 *
 * Uses Framer Motion for icon transition animations and a `mounted`
 * flag to prevent hydration mismatches with SSR.
 */

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { SunIcon, MoonIcon } from '@heroicons/react/24/outline';
import { useAppContext } from '../context/AppContext';

const ThemeToggle = () => {
  const { theme, setTheme } = useAppContext();
  const [mounted, setMounted] = useState(false);

  // Set mounted flag after initial render to avoid SSR hydration issues
  useEffect(() => {
    setMounted(true);
  }, []);

  /**
   * Cycle to the next theme in the sequence.
   * Order: light → dark → sepia → light
   */
  const cycleTheme = () => {
    const themes = ['light', 'dark', 'sepia'];
    const currentIndex = themes.indexOf(theme);
    const nextIndex = (currentIndex + 1) % themes.length;
    const nextTheme = themes[nextIndex];
    setTheme(nextTheme);
  };

  /** Render the appropriate icon based on the current theme */
  const renderThemeIcon = () => {
    // Show default icon while mounting to prevent hydration mismatch
    if (!mounted) {
      return <MoonIcon className="h-5 w-5 text-slate-600" />;
    }

    switch (theme) {
      case 'dark':
        return <SunIcon className="h-5 w-5 text-yellow-400" />;
      case 'sepia':
        return (
          <svg className="h-5 w-5 text-amber-700" fill="currentColor" viewBox="0 0 20 20">
            <path 
              fillRule="evenodd" 
              d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" 
              clipRule="evenodd" 
            />
          </svg>
        );
      default: // light theme
        return <MoonIcon className="h-5 w-5 text-slate-600" />;
    }
  };

  /** Generate an accessible aria-label describing the next theme */
  const getAriaLabel = () => {
    switch (theme) {
      case 'light':
        return 'Switch to dark theme';
      case 'dark':
        return 'Switch to sepia theme';
      case 'sepia':
        return 'Switch to light theme';
      default:
        return 'Switch theme';
    }
  };

  /** Compute theme-appropriate button styling */
  const getButtonClasses = () => {
    const baseClasses = "p-2 rounded-full transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-offset-2";
    
    switch (theme) {
      case 'dark':
        return `${baseClasses} bg-slate-700 hover:bg-slate-600 text-slate-100 focus:ring-offset-slate-900 focus:ring-slate-500`;
      case 'sepia':
        return `${baseClasses} bg-amber-100 hover:bg-amber-200 text-amber-900 focus:ring-offset-amber-50 focus:ring-amber-300`;
      default: // light
        return `${baseClasses} bg-slate-200 hover:bg-slate-300 text-slate-700 focus:ring-offset-white focus:ring-slate-400`;
    }
  };

  return (
    <button
      onClick={cycleTheme}
      aria-label={getAriaLabel()}
      title={getAriaLabel()}
      className={getButtonClasses()}
    >
      {/* Animate icon change when theme switches */}
      <motion.div
        key={theme}
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.2 }}
      >
        {renderThemeIcon()}
      </motion.div>
    </button>
  );
};

export default ThemeToggle;