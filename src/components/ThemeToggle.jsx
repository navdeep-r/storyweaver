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

  const handleToggle = () => {
    const themeOrder = ['light', 'dark', 'sepia'];
    const currentIndex = themeOrder.indexOf(theme);
    const nextIndex = (currentIndex + 1) % themeOrder.length;
    setTheme(themeOrder[nextIndex]);
  };

  const getIcon = () => {
    if (!mounted) {
      // ❗ Return ONLY an icon, no buttons inside
      return <MoonIcon className="h-5 w-5 text-slate-600" />;
    }

    switch (theme) {
      case 'dark':
        return <SunIcon className="h-5 w-5 text-yellow-400" />;

      case 'sepia':
        return (
          <svg
            className="h-5 w-5 text-amber-600"
            fill="currentColor"
            viewBox="0 0 20 20"
          >
            <path
              fillRule="evenodd"
              d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
              clipRule="evenodd"
            />
          </svg>
        );

      default:
        return <MoonIcon className="h-5 w-5 text-slate-600 dark:text-slate-200" />;
    }
  };

  const getLabel = () => {
    switch (theme) {
      case 'dark': return 'Switch to Sepia';
      case 'sepia': return 'Switch to Light';
      default: return 'Switch to Dark';
    }
  };

  return (
    <button
      onClick={handleToggle}
      aria-label={getLabel()}
      title={getLabel()}
      className={`p-2 rounded-full transition-colors ${theme === 'sepia'
        ? 'bg-amber-100 hover:bg-amber-200'
        : 'bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600'
        }`}
    >
      <motion.div
        key={theme}
        initial={{ opacity: 0, scale: 0.8, rotate: -90 }}
        animate={{ opacity: 1, scale: 1, rotate: 0 }}
        exit={{ opacity: 0, scale: 0.8, rotate: 90 }}
        transition={{ duration: 0.2 }}
      >
        {getIcon()}
      </motion.div>
    </button>
  );
};

export default ThemeToggle;
