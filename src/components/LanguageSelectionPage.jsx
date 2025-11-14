import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppContext } from '../context/AppContext';
import { motion } from 'framer-motion';

const LanguageSelectionPage = () => {
  const { filters, setSelectedFilters } = useAppContext();
  const navigate = useNavigate();
  const [selectedLanguage, setSelectedLanguage] = useState('');

  // Get available languages from the filters
  const availableLanguages = filters?.languages || [];

  const handleLanguageSelect = (language) => {
    setSelectedLanguage(language);
    // Set the selected language in the app context
    setSelectedFilters({ language });
    
    // Navigate to the book browser page
    navigate('/browse');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md sm:max-w-2xl bg-white dark:bg-slate-800 rounded-2xl shadow-xl p-6 sm:p-8"
      >
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
            Choose a language to browse books in your preferred language
          </motion.p>
        </div>

        <div className="grid grid-cols-2 xs:grid-cols-3 sm:grid-cols-3 md:grid-cols-4 gap-3 sm:gap-4">
          {availableLanguages.map((language, index) => (
            <motion.button
              key={language}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 * index }}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => handleLanguageSelect(language)}
              className={`p-3 sm:p-4 rounded-xl border-2 transition-all duration-200 ${
                selectedLanguage === language
                  ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
                  : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 text-slate-700 dark:text-slate-300'
              }`}
            >
              <span className="font-medium text-sm sm:text-base">{language}</span>
            </motion.button>
          ))}
          
          {availableLanguages.length === 0 && (
            <div className="col-span-full text-center py-6 sm:py-8">
              <p className="text-slate-500 dark:text-slate-400 text-sm sm:text-base">
                No languages available at the moment
              </p>
            </div>
          )}
        </div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="mt-6 sm:mt-8 text-center"
        >
          <button
            onClick={() => navigate('/browse')}
            className="text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300 text-sm"
          >
            Skip language selection
          </button>
        </motion.div>
      </motion.div>
    </div>
  );
};

export default LanguageSelectionPage;