/**
 * BookBrowser.jsx — Main Page Layout
 *
 * The top-level page component that composes the complete book browsing
 * experience. Handles three UI states:
 *
 * 1. **Loading**: Displays the skeleton grid (LoadingSpinner).
 * 2. **Error**: Shows an error message.
 * 3. **Ready**: Renders a sidebar/grid layout with the filter panel on the
 *    left and the book grid on the right.
 *
 * Also renders the LanguageOverlay (shown before a language is selected)
 * and the CartPanel (floating button + full-page overlay).
 *
 * Layout uses a responsive flex container:
 * - Mobile: stacked (filter above grid)
 * - Desktop (lg+): side-by-side with sticky filter sidebar
 */

import { useAppContext } from '../context/AppContext';
import FilterSidebar from './FilterSidebar';
import BookGrid from './BookGrid';
import CartPanel from './CartPanel';
import Header from './Header';
import LoadingSpinner from './LoadingSpinner';
import ErrorMessage from './ErrorMessage';
import LanguageOverlay from "./LanguageOverlay";

const BookBrowser = () => {
  const { loading, error } = useAppContext();

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
      {/* Full-screen language gate — visible until a language is selected */}
      <LanguageOverlay />

      {/* Sticky header with search, cart badge, and theme toggle */}
      <Header />

      <div className="container mx-auto px-4 py-6 sm:py-8">
        {loading && <LoadingSpinner />}
        {error && <ErrorMessage message={error} />}

        {!loading && !error && (
          <div className="flex flex-col lg:flex-row gap-6 sm:gap-8">
            {/* Filter sidebar — sticky on desktop, full width on mobile */}
            <div className="w-full lg:w-1/4 lg:sticky lg:top-4 lg:self-start">
              <FilterSidebar />
            </div>

            {/* Main book grid area */}
            <div className="w-full lg:w-3/4">
              <BookGrid />
            </div>
          </div>
        )}
      </div>

      {/* Floating cart button + overlay (always rendered for z-index stacking) */}
      <CartPanel />
    </div>
  );
};

export default BookBrowser;