import { useState, useEffect, useCallback, useRef } from 'react';
import { useAppContext } from '../context/AppContext';
import { MagnifyingGlassIcon, XMarkIcon, ShoppingBagIcon } from '@heroicons/react/24/outline';
import { motion, AnimatePresence } from 'framer-motion';
import ThemeToggle from './ThemeToggle';

const CartHeader = ({ onClose }) => {
    const { cart, setCartSelected, cartSelected } = useAppContext();
    const [searchTerm, setSearchTerm] = useState(cartSelected.searchTerm || '');
    const [isSearchFocused, setIsSearchFocused] = useState(false);
    const prevSearchTerm = useRef('');

    // Debounced search effect
    const debouncedSearch = useCallback(
        (term) => {
            setCartSelected((prev) => ({
                ...prev,
                searchTerm: term.trim(),
            }));
        },
        [setCartSelected]
    );

    useEffect(() => {
        if (prevSearchTerm.current === searchTerm) return;
        prevSearchTerm.current = searchTerm;

        const timer = setTimeout(() => {
            debouncedSearch(searchTerm);
        }, 300);

        return () => clearTimeout(timer);
    }, [searchTerm, debouncedSearch]);

    const handleClearSearch = () => {
        setSearchTerm('');
        setCartSelected((prev) => ({
            ...prev,
            searchTerm: '',
        }));
    };

    return (
        <header className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border-b border-slate-200 dark:border-slate-700 sticky top-0 z-10">
            <div className="container mx-auto px-4 py-3 sm:py-4">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
                    <div className="flex items-center justify-between">
                        <motion.div
                            initial={{ x: -20, opacity: 0 }}
                            animate={{ x: 0, opacity: 1 }}
                            className="flex items-center gap-3"
                        >
                            <ShoppingBagIcon className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                            <h1 className="text-xl sm:text-2xl font-bold text-blue-600 dark:text-blue-400">
                                Your Cart
                            </h1>
                            <span className="text-sm text-slate-500 dark:text-slate-400">
                                ({cart.length} items)
                            </span>
                        </motion.div>
                    </div>

                    {/* Search bar - book name only */}
                    <form onSubmit={(e) => e.preventDefault()} className="flex-1 max-w-2xl">
                        <motion.div
                            className={`relative transition-all duration-300 ${isSearchFocused ? 'scale-[1.02]' : ''}`}
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
                                placeholder="Search by book name..."
                                className="block w-full pl-10 pr-12 py-2 sm:py-3 border border-slate-300 dark:border-slate-600 rounded-lg sm:rounded-xl bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder-slate-500 dark:placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 text-sm sm:text-base"
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

                    <div className="flex items-center space-x-4">
                        <motion.button
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={onClose}
                            className="px-4 py-2 rounded-xl text-sm font-medium bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-300 dark:hover:bg-slate-600 transition-all duration-200"
                        >
                            Back to Library
                        </motion.button>
                        <ThemeToggle />
                    </div>
                </div>
            </div>
        </header>
    );
};

export default CartHeader;
