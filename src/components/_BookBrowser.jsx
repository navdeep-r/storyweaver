// File: src/components/BookBrowser.jsx
// Replace your existing BookBrowser.jsx with this file.

import { useAppContext } from '../context/AppContext';
import FilterSidebar from './_FilterSidebar';
import BookGrid from './BookGrid';
import InlineCart from './_CartPanel';
import Header from './Header';
import LoadingSpinner from './LoadingSpinner';
import ErrorMessage from './ErrorMessage';
import AboutFooter from './_AboutFooter';
import InlineDetails from './_InlineDetails';
import CartPanel from './CartPanel';

const BookBrowser = () => {
  const { loading, error } = useAppContext();

  return (
    <div className="min-h-screen bg-linear-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 sepia:from-sepia-50 sepia:to-sepia-100">
      {/* Sticky Top Header */}
      <Header />

      {/* Main 3-column layout: left filters, center book list, right sticky pane */}
      <div className="container mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr_360px] gap-6">

          {/* LEFT: Filter Sidebar (sticky on large screens) */}
          <aside className="hidden lg:block sticky top-24 h-[calc(100vh-6rem)] overflow-y-auto">
            <FilterSidebar />
          </aside>

          {/* MIDDLE: Book Grid */}
          <main className="min-h-[60vh]">
            {loading && <LoadingSpinner />}
            {error && <ErrorMessage message={error} />}
            {!loading && !error && <BookGrid />}
          </main>

          {/* RIGHT COLUMN — two independent boxed sections */}
          <aside className="hidden lg:flex flex-col sticky top-24 h-[calc(100vh-6rem)] gap-4">

            {/* TOP HALF — Inline Cart */}
            <div className="
              h-1/2 
              overflow-y-auto 
              bg-white dark:bg-slate-900 
              rounded-xl 
              border border-slate-200 dark:border-slate-700 
              shadow-md 
              p-4
            ">
              <InlineCart />
            </div>

            {/* BOTTOM HALF — Inline Book Details */}
            <div className="
              h-1/2 
              overflow-y-auto 
              bg-white dark:bg-slate-900 
              rounded-xl 
              border border-slate-200 dark:border-slate-700 
              shadow-md 
              p-4
            ">
              <InlineDetails />
            </div>

          </aside>
          <CartPanel />
        </div>
      </div>

      {/* Full-width About & Contact placeholder */}
      <AboutFooter />
    </div>
  );
};

export default BookBrowser;