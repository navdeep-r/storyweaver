const ErrorMessage = ({ message }) => {
  if (!message) return null;

  return (
    <div className="rounded-lg bg-red-50 p-4 border border-red-200">
      <div className="flex items-start">
        <svg className="h-5 w-5 text-red-500 mt-0.5" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8..." clipRule="evenodd" />
        </svg>

        <div className="ml-3">
          <h3 className="text-sm font-semibold text-red-800">Error</h3>
          <p className="mt-1 text-sm text-red-700">{message}</p>
        </div>
      </div>
    </div>
  );
};

export default ErrorMessage;
