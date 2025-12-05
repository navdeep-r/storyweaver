const InlineDetails = ({ book }) => {
  if (!book) {
    return (
      <div className="text-sm text-slate-500 dark:text-slate-400">
        Select a book to view a quick summary here.
        <br />
        Click <span className="font-medium">View Details</span> on a card to open the full popup.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-100">
        {book.title}
      </h3>

      {book.authors?.length > 0 && (
        <p className="text-sm text-slate-600 dark:text-slate-300">
          by {book.authors.join(', ')}
        </p>
      )}

      <p className="text-sm text-slate-500 dark:text-slate-400 line-clamp-4">
        {book.summary || "No description available."}
      </p>

      <div className="flex flex-wrap gap-2 text-xs">
        {book.language && (
          <span className="px-2 py-1 rounded bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-200">
            {book.language}
          </span>
        )}
        {book.readingLevel && (
          <span className="px-2 py-1 rounded bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-200">
            Level {book.readingLevel}
          </span>
        )}
      </div>
    </div>
  );
};

export default InlineDetails;
