import { useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { XMarkIcon, EyeIcon, BookmarkIcon, ArrowDownTrayIcon } from '@heroicons/react/24/outline';
import { useAppContext } from '../context/AppContext';

const BookDetailsModal = ({ book, isOpen, onClose }) => {
  const { addToCart } = useAppContext();

  const onKeyDown = useCallback((e) => {
    if (e.key === 'Escape') onClose?.();
  }, [onClose]);

  // Lock scroll while modal is open
  useEffect(() => {
    if (!isOpen) return;
    document.addEventListener('keydown', onKeyDown);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = prev;
    };
  }, [isOpen, onKeyDown]);

  if (!book) return null;

  const handleDownload = (format) => {
    addToCart(book.id, format);
    // Could add toast notification here
  };

  const handleAddToShelf = () => {
    // Add to user's personal shelf/wishlist
    console.log('Added to shelf:', book.title);
  };

  const handlePreview = () => {
    // Open book preview
    console.log('Preview book:', book.title);
  };

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
            onClick={onClose}
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 50 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 50 }}
            transition={{ type: 'spring', duration: 0.4 }}
            className="fixed -bottom-8 -right-8 w-[95vw] md:w-[850px] h-[62vh] bg-white dark:bg-slate-900 rounded-2xl shadow-2xl z-999 overflow-hidden flex flex-col"
          // className="fixed inset-4 md:inset-auto md:top-1/2 md:left-1/2 md:transform md:-translate-x-1/2 md:-translate-y-1/2 md:w-full md:max-w-4xl md:max-h-[90vh] bg-white dark:bg-slate-900 rounded-2xl shadow-2xl z-50 overflow-hidden"
          >
            <div className="flex flex-col md:flex-row h-full">
              {/* Book Cover Section */}
              <div className="md:w-1/3 bg-linear-to-br from-slate-50 to-slate-100 dark:from-slate-800 dark:to-slate-700 p-6 flex items-center justify-center">
                {book.coverUrl ? (
                  <motion.img
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ delay: 0.2 }}
                    src={book.coverUrl}
                    alt={book.title}
                    className="max-w-full max-h-80 object-contain rounded-lg shadow-lg"
                  />
                ) : (
                  <motion.div
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ delay: 0.2 }}
                    className="w-48 h-64 bg-slate-200 dark:bg-slate-600 rounded-lg flex items-center justify-center"
                  >
                    <svg className="w-16 h-16 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                    </svg>
                  </motion.div>
                )}
              </div>

              {/* Content Section (stacked vertically: fixed header + scrollable body) */}
              <div className="md:w-2/3 p-6 flex flex-col flex-1 min-h-0">
                {/* Title / header (NOT scrollable) */}
                <div className="shrink-0">
                  <div className="flex items-start justify-between mb-6">
                    <div className="flex-1">
                      <motion.h1
                        initial={{ y: 20, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        transition={{ delay: 0.3 }}
                        className="text-2xl md:text-3xl font-bold text-slate-900 dark:text-slate-100 mb-2"
                      >
                        {book.title}
                      </motion.h1>

                      {book.authors && book.authors.length > 0 && (
                        <motion.p
                          initial={{ y: 20, opacity: 0 }}
                          animate={{ y: 0, opacity: 1 }}
                          transition={{ delay: 0.4 }}
                          className="text-lg text-slate-600 dark:text-slate-300"
                        >
                          by {book.authors.join(', ')}
                        </motion.p>
                      )}
                    </div>

                    <motion.button
                      initial={{ scale: 0, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={{ delay: 0.2 }}
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                      onClick={onClose}
                      className="p-2 rounded-full bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"
                    >
                      <XMarkIcon className="w-6 h-6 text-slate-600 dark:text-slate-300" />
                    </motion.button>
                  </div>
                </div>

                {/* Main content / desc (ONLY this scrolls) */}
                <div className="overflow-y-auto flex-1 min-h-0 pb-16">
                  {/* Metadata Tags */}
                  <motion.div
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.5 }}
                    className="flex flex-wrap gap-2 mb-6"
                  >
                    {book.language && (
                      <span className="px-3 py-1 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-100 rounded-full text-sm font-medium">
                        {book.language}
                      </span>
                    )}
                    {book.readingLevel && (
                      <span className="px-3 py-1 bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-100 rounded-full text-sm font-medium">
                        Level: {book.readingLevel}
                      </span>
                    )}
                    {book.publisher && (
                      <span className="px-3 py-1 bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-100 rounded-full text-sm font-medium">
                        {book.publisher}
                      </span>
                    )}
                  </motion.div>

                  {/* Description */}
                  {book.summary && (
                    <motion.div
                      initial={{ y: 20, opacity: 0 }}
                      animate={{ y: 0, opacity: 1 }}
                      transition={{ delay: 0.6 }}
                      className="mb-8"
                    >
                      <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-3">
                        Description
                      </h3>
                      <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
                        {book.summary}
                      </p>
                    </motion.div>
                  )}

                  {/* Action Buttons */}
                  <motion.div
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.7 }}
                    className="flex flex-col sm:flex-row gap-3"
                  >
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={handlePreview}
                      className="flex items-center justify-center px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-medium transition-colors"
                    >
                      <EyeIcon className="w-5 h-5 mr-2" />
                      Preview Book
                    </motion.button>

                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={handleAddToShelf}
                      className="flex items-center justify-center px-6 py-3 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-800 dark:text-slate-200 rounded-xl font-medium transition-colors"
                    >
                      <BookmarkIcon className="w-5 h-5 mr-2" />
                      Add to Shelf
                    </motion.button>
                  </motion.div>

                  {/* Download Options */}
                  {book.acquisitions && book.acquisitions.length > 0 && (
                    <motion.div
                      initial={{ y: 20, opacity: 0 }}
                      animate={{ y: 0, opacity: 1 }}
                      transition={{ delay: 0.8 }}
                      className="mt-6 pt-6 border-t border-slate-200 dark:border-slate-700"
                    >
                      <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-3">
                        Download Formats
                      </h3>
                      <div className="flex flex-wrap gap-2">
                        {book.acquisitions.map((acq, index) => {
                          const format = acq.type.includes('pdf')
                            ? 'PDF'
                            : acq.type.includes('epub')
                              ? 'EPUB'
                              : acq.type.split('/').pop().toUpperCase();
                          return (
                            <motion.button
                              key={index}
                              whileHover={{ scale: 1.05 }}
                              whileTap={{ scale: 0.95 }}
                              onClick={() => handleDownload(format)}
                              className="flex items-center px-4 py-2 bg-green-100 dark:bg-green-900 hover:bg-green-200 dark:hover:bg-green-800 text-green-800 dark:text-green-100 rounded-lg text-sm font-medium transition-colors"
                            >
                              <ArrowDownTrayIcon className="w-4 h-4 mr-2" />
                              {format}
                            </motion.button>
                          );
                        })}
                      </div>
                    </motion.div>
                  )}
                </div>
              </div>


            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>,
    document.body
  );
};

export default BookDetailsModal;