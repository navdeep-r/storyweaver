// Simple skeleton grid shimmer for loading books
const SkeletonCard = () => (
  <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm animate-pulse">
    <div className="aspect-3/4 bg-slate-200" />
    <div className="p-4">
      <div className="h-4 bg-slate-200 rounded w-3/4 mb-2"></div>
      <div className="h-3 bg-slate-200 rounded w-1/2 mb-2"></div>
      <div className="h-3 bg-slate-200 rounded w-1/3"></div>
    </div>
  </div>
);

const LoadingSpinner = ({ count = 8 }) => {
  const items = Array.from({ length: count });
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
      {items.map((_, i) => (
        <SkeletonCard key={i} />
      ))}
    </div>
  );
};

export default LoadingSpinner;