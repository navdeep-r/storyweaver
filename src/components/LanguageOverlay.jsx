/**
 * LanguageOverlay.jsx — Full-Screen Language Selection Gate
 *
 * A full-screen overlay that appears on the initial load (or whenever no
 * language is selected). Displays all available languages from the OPDS
 * catalog as a grid of clickable buttons.
 *
 * Selecting a language:
 * - Sets the global language filter
 * - Resets all other filter dimensions (authors, publishers, etc.)
 * - Triggers a data fetch for that language's catalog
 * - Animates out the overlay
 *
 * The overlay waits for sessionStorage hydration to complete before
 * deciding whether to show. This prevents a flash of the overlay on
 * page refresh when the user has already selected a language.
 *
 * While available languages are loading, shows a skeleton pulse animation.
 */

import { useAppContext } from '../context/AppContext';
import { motion, AnimatePresence } from 'framer-motion';

const LanguageOverlay = () => {
    const { facets, selected, setSelected, hydrated } = useAppContext();

    // Extract language names from facet keys
    const availableLanguages = Object.keys(facets.languages || {});

    // Show overlay only after hydration AND when no language is selected.
    // This prevents the overlay from flashing on refresh if language was already chosen.
    const isVisible = hydrated && !selected.language;

    /**
     * Handle language selection.
     * Sets the language and resets all other filter dimensions to their defaults.
     *
     * @param {string} language - The selected language key.
     */
    const handleLanguageSelect = (language) => {
        setSelected({
            language: language,
            authors: [],
            publishers: [],
            categories: [],
            readingLevels: [],
            q: "",
        });
    };

    return (
        <AnimatePresence>
            {isVisible && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.3 }}
                    className="fixed inset-0 z-50 bg-white dark:bg-slate-900 flex items-center justify-center p-4"
                >
                    <motion.div
                        initial={{ opacity: 0, y: 20, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 20, scale: 0.95 }}
                        transition={{ duration: 0.4, delay: 0.1 }}
                        className="w-full max-w-md sm:max-w-2xl bg-slate-50 dark:bg-slate-800 rounded-2xl shadow-xl p-6 sm:p-8"
                    >
                        {/* Heading */}
                        <div className="text-center mb-6 sm:mb-8">
                            <motion.h1
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                transition={{ delay: 0.2 }}
                                className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white mb-2"
                            >
                                Select Your Preferred Language
                            </motion.h1>
                            <motion.p
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                transition={{ delay: 0.3 }}
                                className="text-slate-600 dark:text-slate-300 text-sm sm:text-base"
                            >
                                Choose a language to browse books
                            </motion.p>
                        </div>

                        {/* Language button grid */}
                        <div className="grid grid-cols-2 xs:grid-cols-3 sm:grid-cols-3 md:grid-cols-4 gap-3 sm:gap-4">
                            {availableLanguages.map((language, index) => (
                                <motion.button
                                    key={language}
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: 0.1 * Math.min(index, 8) }} // Cap stagger at 8
                                    whileHover={{ scale: 1.05 }}
                                    whileTap={{ scale: 0.95 }}
                                    onClick={() => handleLanguageSelect(language)}
                                    className="p-3 sm:p-4 rounded-xl border-2 transition-all duration-200 border-slate-200 dark:border-slate-700 hover:border-blue-400 dark:hover:border-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/30 text-slate-700 dark:text-slate-300"
                                >
                                    <span className="font-medium text-sm sm:text-base">
                                        {language.replace(/\s*\(\s*\)$/, '')}
                                    </span>
                                </motion.button>
                            ))}

                            {/* Loading state — shown while languages are being fetched */}
                            {availableLanguages.length === 0 && (
                                <div className="col-span-full text-center py-6 sm:py-8">
                                    <div className="animate-pulse">
                                        <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-48 mx-auto mb-2"></div>
                                        <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded w-32 mx-auto"></div>
                                    </div>
                                    <p className="text-slate-500 dark:text-slate-400 text-sm sm:text-base mt-4">
                                        Loading languages...
                                    </p>
                                </div>
                            )}
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};

export default LanguageOverlay;
