import { useAppContext } from '../context/AppContext';
import FilterSidebar from './FilterSidebar';
import BookGrid from './BookGrid';
import CartPanel from './CartPanel';
import Header from './Header';
import LoadingSpinner from './LoadingSpinner';
import ErrorMessage from './ErrorMessage';

const BookBrowser = () => {
  const { loading, error } = useAppContext();

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
      <Header />
      
      <div className="container mx-auto px-4 py-6 sm:py-8">
        {loading && <LoadingSpinner />}
        {error && <ErrorMessage message={error} />}
        
        {!loading && !error && (
          <div className="flex flex-col lg:flex-row gap-6 sm:gap-8">
            {/* Filter sidebar - hidden on mobile by default, shown when needed */}
            <div className="w-full lg:w-1/4">
              <FilterSidebar />
            </div>
            
            {/* Main content area */}
            <div className="w-full lg:w-3/4">
              <BookGrid />
            </div>
          </div>
        )}
      </div>
      
      <CartPanel />
    </div>
  );
};

export default BookBrowser;