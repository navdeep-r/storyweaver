import { useState } from 'react';
import { useAppContext } from '../context/AppContext';
import { motion } from 'framer-motion';
import { EyeIcon } from '@heroicons/react/24/outline';
import BookDetailsModal from './BookDetailsModal';

const BookCard = ({ book }) => {
  const { addToCart } = useAppContext();
  const [showModal, setShowModal] = useState(false);

  const handleAddToCart = (format) => {
    addToCart(book.id, format);
  };

  // Now backend returns authors as array of strings; safely get first author
  const firstAuthorName = Array.isArray(book.authors) && book.authors.length > 0 ? book.authors[0] : null;

  // Get available formats
  const formats = book.acquisitions.map(acq => {
    if (acq.type.includes('pdf')) return 'PDF';
    if (acq.type.includes('epub')) return 'EPUB';
    return acq.type.split('/').pop().toUpperCase();
  });

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      whileHover={{ y: -2, scale: 1.01 }}
      transition={{ duration: 0.15 }}
      className="group bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 overflow-hidden shadow-xs hover:shadow-sm transition-all duration-200 h-full flex flex-col"
    >
      <div className="relative aspect-[3/4] overflow-hidden">
        {book.coverUrl ? (
          <img
            src={book.coverUrl}
            alt={book.title}
            className="w-full h-full object-cover transform transition-transform duration-200 group-hover:scale-105"
            onError={(e) => {
              e.target.style.display = 'none';
              if (e.target.nextSibling) e.target.nextSibling.style.display = 'flex';
            }}
          />
        ) : null}
        {!book.coverUrl && (
          <div className="w-full h-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center">
            <svg className="w-6 h-6 text-slate-300 dark:text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
          </div>
        )}

        {/* Hover preview overlay */}
        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center">
          <motion.button
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setShowModal(true)}
            className="bg-white/90 backdrop-blur-sm text-slate-800 px-2 py-1 rounded font-medium flex items-center space-x-1 shadow text-xs"
          >
            <EyeIcon className="w-2.5 h-2.5" />
            <span>View</span>
          </motion.button>
        </div>
      </div>

      <div className="p-2 flex flex-col flex-grow">
        <h3 className="font-semibold text-slate-800 dark:text-slate-100 text-xs line-clamp-2 leading-tight" title={book.title}>{book.title}</h3>

        {firstAuthorName ? (
          <p className="text-[10px] text-slate-600 dark:text-slate-400 mt-1 line-clamp-1">by {firstAuthorName}</p>
        ) : (
          <p className="text-[10px] text-slate-600 dark:text-slate-400 mt-1 line-clamp-1">by Unknown author</p>
        )}

        {/* Smart Tags */}
        <div className="mt-1.5 flex flex-wrap gap-0.5">
          {book.language && (
            <span className="inline-flex items-center px-1 py-0.5 rounded text-[9px] font-medium bg-blue-100 dark:bg-blue-900/50 text-blue-800 dark:text-blue-200">
              {book.language}
            </span>
          )}
          {book.readingLevel && (
            <span className="inline-flex items-center px-1 py-0.5 rounded text-[9px] font-medium bg-green-100 dark:bg-green-900/50 text-green-800 dark:text-green-200">
              L{book.readingLevel}
            </span>
          )}
        </div>

        <div className="mt-2 flex flex-wrap gap-0.5 mt-auto">
          {formats.map((format, index) => (
            <button
              key={`${book.id}-${index}`}
              onClick={() => handleAddToCart(format)}
              className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-medium bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"
            >
              {format}
            </button>
          ))}
        </div>
      </div>

      {/* Book Details Modal */}
      <BookDetailsModal
        book={book}
        isOpen={showModal}
        onClose={() => setShowModal(false)}
      />
    </motion.div>
  );
};

export default BookCard;