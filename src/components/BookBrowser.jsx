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
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <Header />

      <div className="container mx-auto px-4 py-8">
        {loading && <LoadingSpinner />}
        {error && <ErrorMessage message={error} />}

        {!loading && !error && (
          <div className="flex flex-col lg:flex-row gap-8">
            <div className="w-full lg:w-1/4">
              <FilterSidebar />
            </div>

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