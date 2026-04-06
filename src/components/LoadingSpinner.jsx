/**
 * LoadingSpinner.jsx — Skeleton Loading Grid
 *
 * Displays a grid of skeleton "cards" that mimic the BookCard layout,
 * providing a smooth loading experience while book data is being fetched.
 *
 * Each skeleton card includes:
 * - A 3:4 aspect ratio placeholder (matching BookCard cover area)
 * - A spinning border animation to indicate loading
 * - Faux "page lines" at the bottom of the cover area
 * - Placeholder bars for title, author, and format tags
 *
 * The grid uses the same responsive column breakpoints as BookGrid
 * so the skeleton layout matches the final content layout perfectly.
 *
 * @param {Object} props
 * @param {number} [props.count=12] - Number of skeleton cards to render.
 */

/** Individual skeleton card that mimics a BookCard's shape and proportions */
const SkeletonCard = () => (
  <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 overflow-hidden shadow-xs animate-pulse">
    {/* Cover image placeholder with loading spinner */}
    <div className="aspect-[3/4] bg-slate-200 dark:bg-slate-700 relative">
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="w-6 h-6 sm:w-8 sm:h-8 border-2 border-slate-300 dark:border-slate-600 rounded-full border-t-transparent animate-spin"></div>
      </div>
      {/* Decorative "page lines" effect */}
      <div className="absolute bottom-1 left-1 right-1 h-1 bg-slate-300 dark:bg-slate-600 rounded-full opacity-30 animate-pulse"></div>
      <div className="absolute bottom-2 left-2 right-2 h-1 bg-slate-300 dark:bg-slate-600 rounded-full opacity-20 animate-pulse delay-75"></div>
    </div>
    {/* Text content placeholders */}
    <div className="p-2">
      <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded w-3/4 mb-1"></div>
      <div className="h-2 bg-slate-200 dark:bg-slate-700 rounded w-1/2 mb-1"></div>
      <div className="flex gap-1 mt-1.5">
        <div className="h-2 w-2 bg-slate-200 dark:bg-slate-700 rounded"></div>
        <div className="h-2 w-2 bg-slate-200 dark:bg-slate-700 rounded"></div>
      </div>
    </div>
  </div>
);

const LoadingSpinner = ({ count = 12 }) => {
  const items = Array.from({ length: count });
  return (
    <div className="grid grid-cols-2 xs:grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-7 2xl:grid-cols-8 gap-2 sm:gap-3">
      {items.map((_, i) => (
        <SkeletonCard key={i} />
      ))}
    </div>
  );
};

export default LoadingSpinner;