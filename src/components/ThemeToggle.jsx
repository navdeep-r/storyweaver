import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { SunIcon, MoonIcon } from '@heroicons/react/24/outline';
import { useAppContext } from '../context/AppContext';

const ThemeToggle = () => {
  const { theme, setTheme } = useAppContext();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Completely rewritten theme toggle logic
  const cycleTheme = () => {
    // Define the theme cycle order
    const themes = ['light', 'dark', 'sepia'];
    
    // Find current theme index
    const currentIndex = themes.indexOf(theme);
    
    // Calculate next theme index (cycle back to 0 if at end)
    const nextIndex = (currentIndex + 1) % themes.length;
    
    // Apply the new theme
    const nextTheme = themes[nextIndex];
    setTheme(nextTheme);
  };

  // Completely rewritten icon rendering logic
  const renderThemeIcon = () => {
    // Show a default icon while component is mounting to prevent hydration issues
    if (!mounted) {
      return <MoonIcon className="h-5 w-5 text-slate-600" />;
    }

    // Render appropriate icon based on current theme
    switch (theme) {
      case 'dark':
        return <SunIcon className="h-5 w-5 text-yellow-400" />;
      case 'sepia':
        // Custom SVG for sepia theme
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

  // Completely rewritten aria label logic
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

  // Completely rewritten button styling logic
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
      <motion.div
        key={theme} // Use theme as key to trigger animation on change
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