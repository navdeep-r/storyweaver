import { useAppContext } from '../context/AppContext';
import BookCard from './BookCard';
import { motion, AnimatePresence } from 'framer-motion';

const PaginationControls = ({ page, perPage, total, onPage, onAddAll }) => {
  const totalPages = Math.max(1, Math.ceil((total || 0) / perPage));
  return (
    <div className="flex items-center justify-between mb-4">
      <div className="text-sm text-slate-600 dark:text-slate-400">Page {page} of {totalPages}</div>
      <div className="space-x-2">
        <button
          onClick={() => onAddAll("epub")}
          className="px-3 py-1 bg-blue-100 dark:bg-blue-900/50 text-blue-800 dark:text-blue-200 rounded hover:bg-blue-200 dark:hover:bg-blue-800 text-xs"
        >
          Add All EPUB
        </button>

        <button
          onClick={() => onAddAll("pdf")}
          className="px-3 py-1 bg-green-100 dark:bg-green-900/50 text-green-800 dark:text-green-200 rounded hover:bg-green-200 dark:hover:bg-green-800 text-xs"
        >
          Add All PDF
        </button>
        <button disabled={page <= 1} onClick={() => onPage(page - 1)} className="px-3 py-1 bg-slate-100 dark:bg-slate-700 rounded disabled:opacity-50 text-xs text-slate-700 dark:text-slate-300">Prev</button>
        <button disabled={page >= totalPages} onClick={() => onPage(page + 1)} className="px-3 py-1 bg-slate-100 dark:bg-slate-700 rounded disabled:opacity-50 text-xs text-slate-700 dark:text-slate-300">Next</button>
      </div>
    </div>
  );
};


const BookGrid = () => {
  const { addToCart, books, page, perPage, total, setPage } = useAppContext();

  const addAll = (format) => {
    books.forEach(book => {
      // pick an acquisition matching requested format
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


  if (!books || books.length === 0) {
    return (
      <div className="text-center py-12">
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

  // We render exactly the page returned by the backend (should be <= perPage)
  const displayBooks = books || [];

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-lg font-bold text-slate-800 dark:text-slate-200">
          Books <span className="text-slate-500 dark:text-slate-400 text-sm font-normal">({total})</span>
        </h2>
      </div>


      <PaginationControls page={page} perPage={perPage} total={total} onPage={setPage} onAddAll={addAll} />

      <motion.div layout className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-7 2xl:grid-cols-8 gap-3">
        <AnimatePresence>
          {displayBooks.map((book) => (
            <motion.div key={book.id} layout initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}>
              <BookCard book={book} />
            </motion.div>
          ))}
        </AnimatePresence>
      </motion.div>

      <div className="mt-6">
        <PaginationControls page={page} perPage={perPage} total={total} onPage={setPage} />
      </div>
    </div>
  );
};

export default BookGrid;