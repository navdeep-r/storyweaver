/**
 * BookGrid.jsx — Paginated Book Grid
 *
 * Renders a responsive CSS grid of BookCard components with pagination
 * controls. Also provides "Add All EPUB" and "Add All PDF" batch action
 * buttons for quickly adding an entire page of books to the cart.
 *
 * Layout grid breakpoints:
 * - 2 columns on smallest screens
 * - Scales up to 8 columns on ultra-wide (2xl) displays
 *
 * Displays an empty state with guidance when no books match the filters.
 */

import { useAppContext } from '../context/AppContext';
import BookCard from './BookCard';
import { motion, AnimatePresence } from 'framer-motion';

/**
 * PaginationControls — Reusable pagination bar.
 *
 * Displays page info, batch add buttons, and prev/next navigation.
 * Rendered both above and below the grid for easy access.
 *
 * @param {Object} props
 * @param {number} props.page - Current page number.
 * @param {number} props.perPage - Items per page.
 * @param {number} props.total - Total matching items.
 * @param {Function} props.onPage - Page change callback.
 * @param {Function} props.onAddAll - Batch add callback (receives format string).
 */
const PaginationControls = ({ page, perPage, total, onPage, onAddAll }) => {
  const totalPages = Math.max(1, Math.ceil((total || 0) / perPage));
  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-3 mb-4">
      <div className="text-sm text-slate-600 dark:text-slate-400">Page {page} of {totalPages}</div>
      <div className="flex flex-wrap justify-center gap-1 sm:gap-2">
        {/* Batch add all visible books in EPUB format */}
        <button
          onClick={() => onAddAll("epub")}
          className="px-2 py-1 sm:px-3 sm:py-1 bg-blue-100 dark:bg-blue-900/50 text-blue-800 dark:text-blue-200 rounded hover:bg-blue-200 dark:hover:bg-blue-800 text-xs"
        >
          Add All EPUB
        </button>

        {/* Batch add all visible books in PDF format */}
        <button
          onClick={() => onAddAll("pdf")}
          className="px-2 py-1 sm:px-3 sm:py-1 bg-green-100 dark:bg-green-900/50 text-green-800 dark:text-green-200 rounded hover:bg-green-200 dark:hover:bg-green-800 text-xs"
        >
          Add All PDF
        </button>

        {/* Previous page */}
        <button
          disabled={page <= 1}
          onClick={() => onPage(page - 1)}
          className="px-2 py-1 sm:px-3 sm:py-1 bg-slate-100 dark:bg-slate-700 rounded disabled:opacity-50 text-xs text-slate-700 dark:text-slate-300"
        >
          Prev
        </button>

        {/* Next page */}
        <button
          disabled={page >= totalPages}
          onClick={() => onPage(page + 1)}
          className="px-2 py-1 sm:px-3 sm:py-1 bg-slate-100 dark:bg-slate-700 rounded disabled:opacity-50 text-xs text-slate-700 dark:text-slate-300"
        >
          Next
        </button>
      </div>
    </div>
  );
};


const BookGrid = () => {
  const { addToCart, books, page, perPage, total, setPage } = useAppContext();

  /**
   * Batch add all visible books to the cart in a specified format.
   * Only adds books that have an acquisition link matching the format.
   *
   * @param {string} format - "pdf" or "epub"
   */
  const addAll = (format) => {
    books.forEach(book => {
      const match = book.acquisitions?.find(a =>
        format === "pdf"
          ? a.type?.includes("pdf")
          : a.type?.includes("epub")
      );

      if (match) {
        addToCart(book.id || book.opdsId, format);
      }
    });
  };

  // Empty state — no books match the current filters
  if (!books || books.length === 0) {
    return (
      <div className="text-center py-8 sm:py-12">
        <div className="text-slate-400 dark:text-slate-500">
          <svg className="mx-auto h-12 w-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
          </svg>
          <h3 className="mt-2 text-sm font-medium text-slate-900 dark:text-slate-300">No books found</h3>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Try adjusting your filters to see more results.</p>
        </div>
      </div>
    );
  }

  // The backend returns exactly one page of books
  const displayBooks = books || [];

  return (
    <div>
      {/* Header with total count */}
      <div className="flex items-center justify-between mb-4 sm:mb-6">
        <h2 className="text-lg font-bold text-slate-800 dark:text-slate-200">
          Books <span className="text-slate-500 dark:text-slate-400 text-sm font-normal">({total})</span>
        </h2>
      </div>

      {/* Top pagination controls */}
      <PaginationControls page={page} perPage={perPage} total={total} onPage={setPage} onAddAll={addAll} />

      {/* Responsive book grid with animated layout */}
      <motion.div
        layout
        className="grid grid-cols-2 xs:grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-7 2xl:grid-cols-8 gap-2 sm:gap-3"
      >
        <AnimatePresence>
          {displayBooks.map((book) => (
            <motion.div
              key={book.id}
              layout
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
            >
              <BookCard book={book} />
            </motion.div>
          ))}
        </AnimatePresence>
      </motion.div>

      {/* Bottom pagination controls */}
      <div className="mt-4 sm:mt-6 pb-14">
        <PaginationControls page={page} perPage={perPage} total={total} onPage={setPage} onAddAll={addAll} />
      </div>
    </div>
  );
};

export default BookGrid;