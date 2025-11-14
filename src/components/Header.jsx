import { useState, useEffect, useCallback, useRef } from 'react';
import { useAppContext } from '../context/AppContext';
import { MagnifyingGlassIcon, ShoppingBagIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { motion, AnimatePresence } from 'framer-motion';
import ThemeToggle from './ThemeToggle';

const Header = () => {
  const { cart, toggleCustomFields, showCustomFields, setSelectedFilters } = useAppContext();
  const [searchTerm, setSearchTerm] = useState('');
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const prevSearchTerm = useRef("");

  // Debounced search effect
  const debouncedSearch = useCallback(
    (term) => {
      if (term.trim()) {
        setSelectedFilters({ search: term.trim() });
      } else {
        setSelectedFilters({ search: undefined });
      }

    },
    [setSelectedFilters]
  );

  useEffect(() => {
    if (prevSearchTerm.current === searchTerm) return;
    prevSearchTerm.current = searchTerm;

    const timer = setTimeout(() => {
      console.log("rel:debouncedSearch running with:", searchTerm);
      debouncedSearch(searchTerm);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchTerm, debouncedSearch]);

  const handleClearSearch = () => {
    setSearchTerm('');
    setSelectedFilters({ search: undefined });
  };

  const handleSearch = (e) => {
    e.preventDefault();
    // Search is handled by debounced effect
  };

  return (
    <header className="bg-white/80 dark:bg-slate-900/80 sepia:bg-sepia-50/80 backdrop-blur-xl border-b border-slate-200 dark:border-slate-700 sepia:border-sepia-300 sticky top-0 z-10">
      <div className="container mx-auto px-4 py-3 sm:py-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
          <div className="flex items-center justify-between">
            <motion.h1
              initial={{ x: -20, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              className="text-xl sm:text-2xl font-bold text-blue-600 dark:text-blue-400"
            >
              StoryWeaver Library
            </motion.h1>
            <div className="sm:hidden relative">
              <span className="absolute -top-2 -right-2 bg-blue-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                {cart.length}
              </span>
              <ShoppingBagIcon className="h-6 w-6 text-slate-600 dark:text-slate-300" />
            </div>
          </div>

          <form onSubmit={handleSearch} className="flex-1 max-w-2xl">
            <motion.div
              className={`relative transition-all duration-300 ${isSearchFocused ? 'scale-[1.02]' : ''}`}
              whileFocus={{ scale: 1.02 }}
            >
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <MagnifyingGlassIcon className="h-5 w-5 text-slate-400" />
              </div>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onFocus={() => setIsSearchFocused(true)}
                onBlur={() => setIsSearchFocused(false)}
                placeholder="Search books, authors, categories..."
                className="block w-full pl-10 pr-12 py-2 sm:py-3 border border-slate-300 dark:border-slate-600 sepia:border-sepia-400 rounded-lg sm:rounded-xl bg-white dark:bg-slate-800 sepia:bg-sepia-100 text-slate-900 dark:text-slate-100 sepia:text-sepia-900 placeholder-slate-500 dark:placeholder-slate-400 sepia:placeholder-sepia-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 text-sm sm:text-base"
              />
              <AnimatePresence>
                {searchTerm && (
                  <motion.button
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0, opacity: 0 }}
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    type="button"
                    onClick={handleClearSearch}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center"
                  >
                    <XMarkIcon className="h-5 w-5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200" />
                  </motion.button>
                )}
              </AnimatePresence>
            </motion.div>
          </form>

          <div className="flex items-center space-x-3 sm:space-x-4">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={toggleCustomFields}
              className={`px-3 py-1.5 sm:px-4 sm:py-2 rounded-lg sm:rounded-xl text-xs sm:text-sm font-medium transition-all duration-200 ${showCustomFields
                ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/25'
                : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-300 dark:hover:bg-slate-600'
                }`}
            >
              {showCustomFields ? 'Hide Custom Fields' : 'Show Custom Fields'}
            </motion.button>

            <div className="hidden sm:flex items-center relative">
              <motion.span
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="absolute -top-2 -right-2 bg-blue-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center"
              >
                {cart.length}
              </motion.span>
              <ShoppingBagIcon className="h-6 w-6 text-slate-600 dark:text-slate-300" />
            </div>
            <ThemeToggle />
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;