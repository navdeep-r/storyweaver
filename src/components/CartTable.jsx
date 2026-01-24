import { useMemo } from 'react';
import { useAppContext } from '../context/AppContext';
import { motion } from 'framer-motion';
import { TrashIcon, ArrowDownTrayIcon } from '@heroicons/react/24/outline';

const CartTable = () => {
    const {
        cart,
        cartSelected,
        cartSelectedItems,
        cartPage,
        cartPerPage,
        toggleCartItem,
        selectAllCartItems,
        clearCartSelection,
        bulkRemoveFromCart,
        removeFromCart,
        setCartPage,
        clearCart,
    } = useAppContext();

    // Apply filters to cart items
    const filteredCart = useMemo(() => {
        return cart.map((item, originalIndex) => ({ ...item, originalIndex }))
            .filter(({ book, language }) => {
                // Search filter (book name only)
                if (cartSelected.searchTerm) {
                    const searchLower = cartSelected.searchTerm.toLowerCase();
                    if (!book.title?.toLowerCase().includes(searchLower)) {
                        return false;
                    }
                }

                // Language filter (use stored language from cart item, not book.language)
                if (cartSelected.languages?.length > 0) {
                    if (!language || !cartSelected.languages.includes(language)) {
                        return false;
                    }
                }

                // Author filter
                if (cartSelected.authors?.length > 0) {
                    const bookAuthor = book.authors?.[0];
                    if (!bookAuthor || !cartSelected.authors.includes(bookAuthor)) {
                        return false;
                    }
                }

                // Publisher filter
                if (cartSelected.publishers?.length > 0) {
                    if (!book.publisher || !cartSelected.publishers.includes(book.publisher)) {
                        return false;
                    }
                }

                // Category filter
                if (cartSelected.categories?.length > 0) {
                    const bookCategory = book.categories?.[0];
                    if (!bookCategory || !cartSelected.categories.includes(bookCategory)) {
                        return false;
                    }
                }

                return true;
            });
    }, [cart, cartSelected]);

    // Pagination
    const totalPages = Math.max(1, Math.ceil(filteredCart.length / cartPerPage));
    const startIndex = (cartPage - 1) * cartPerPage;
    const paginatedCart = filteredCart.slice(startIndex, startIndex + cartPerPage);

    // Get original indices of visible items for selection
    const visibleOriginalIndices = paginatedCart.map(item => item.originalIndex);

    // Check if all visible items are selected
    const allVisibleSelected = visibleOriginalIndices.length > 0 &&
        visibleOriginalIndices.every(i => cartSelectedItems.includes(i));

    const handleSelectAll = () => {
        if (allVisibleSelected) {
            clearCartSelection();
        } else {
            selectAllCartItems(visibleOriginalIndices);
        }
    };

    const handleBulkRemove = () => {
        if (cartSelectedItems.length === 0) return;
        bulkRemoveFromCart(cartSelectedItems);
    };
    const handleDownloadAll = () => {
        // TODO: Implement actual download logic
        alert(`Downloading ${cart.length} items...`);
    };

    const selectedCount = cartSelectedItems.length;

    return (
        <div className="flex flex-col h-full">
            {/* Controls bar */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 mb-4 flex-shrink-0">
                <div className="text-sm text-slate-600 dark:text-slate-400">
                    Showing {paginatedCart.length} of {filteredCart.length} items
                    {selectedCount > 0 && (
                        <span className="ml-2 text-blue-600 dark:text-blue-400">
                            ({selectedCount} selected)
                        </span>
                    )}
                </div>
                <div className="flex flex-wrap justify-center gap-1 sm:gap-2">
                    <button
                        onClick={handleDownloadAll}
                        disabled={cart.length === 0}
                        className="px-2 py-1 sm:px-3 sm:py-1 bg-blue-100 dark:bg-blue-900/50 text-blue-800 dark:text-blue-200 rounded hover:bg-blue-200 dark:hover:bg-blue-800 disabled:opacity-50 text-xs flex items-center gap-1"
                    >
                        <ArrowDownTrayIcon className="h-4 w-4" />
                        Download All
                    </button>
                    <button
                        onClick={clearCart}
                        disabled={cart.length === 0}
                        className="px-2 py-1 sm:px-3 sm:py-1 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded hover:bg-slate-200 dark:hover:bg-slate-600 disabled:opacity-50 text-xs"
                    >
                        Clear All
                    </button>
                    {selectedCount > 0 && (
                        <button
                            onClick={handleBulkRemove}
                            className="px-2 py-1 sm:px-3 sm:py-1 bg-red-100 dark:bg-red-900/50 text-red-800 dark:text-red-200 rounded hover:bg-red-200 dark:hover:bg-red-800 text-xs flex items-center gap-1"
                        >
                            <TrashIcon className="h-4 w-4" />
                            Remove Selected ({selectedCount})
                        </button>
                    )}
                    <button
                        disabled={cartPage <= 1}
                        onClick={() => setCartPage(cartPage - 1)}
                        className="px-2 py-1 sm:px-3 sm:py-1 bg-slate-100 dark:bg-slate-700 rounded disabled:opacity-50 text-xs text-slate-700 dark:text-slate-300"
                    >
                        Prev
                    </button>
                    <span className="px-2 py-1 text-xs text-slate-600 dark:text-slate-400">
                        {cartPage} / {totalPages}
                    </span>
                    <button
                        disabled={cartPage >= totalPages}
                        onClick={() => setCartPage(cartPage + 1)}
                        className="px-2 py-1 sm:px-3 sm:py-1 bg-slate-100 dark:bg-slate-700 rounded disabled:opacity-50 text-xs text-slate-700 dark:text-slate-300"
                    >
                        Next
                    </button>
                </div>
            </div>

            {/* Table */}
            <div className="flex-1 overflow-auto rounded-lg border border-slate-200 dark:border-slate-700">
                <table className="w-full text-sm">
                    <thead className="bg-slate-50 dark:bg-slate-800 sticky top-0">
                        <tr>
                            <th className="px-3 py-3 text-left">
                                <input
                                    type="checkbox"
                                    checked={allVisibleSelected}
                                    onChange={handleSelectAll}
                                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-slate-300 dark:border-slate-600 rounded"
                                />
                            </th>
                            <th className="px-3 py-3 text-left font-medium text-slate-700 dark:text-slate-300">Title</th>
                            <th className="px-3 py-3 text-left font-medium text-slate-700 dark:text-slate-300 hidden sm:table-cell">Author</th>
                            <th className="px-3 py-3 text-left font-medium text-slate-700 dark:text-slate-300 hidden md:table-cell">Publisher</th>
                            <th className="px-3 py-3 text-left font-medium text-slate-700 dark:text-slate-300 hidden lg:table-cell">Language</th>
                            <th className="px-3 py-3 text-left font-medium text-slate-700 dark:text-slate-300 hidden xl:table-cell">Category</th>
                            <th className="px-3 py-3 text-left font-medium text-slate-700 dark:text-slate-300">Format</th>
                            <th className="px-3 py-3 text-left font-medium text-slate-700 dark:text-slate-300">Action</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                        {paginatedCart.length === 0 ? (
                            <tr>
                                <td colSpan={8} className="px-3 py-8 text-center text-slate-500 dark:text-slate-400">
                                    No items match your filters
                                </td>
                            </tr>
                        ) : (
                            paginatedCart.map(({ book, format, language, originalIndex }) => {
                                const isSelected = cartSelectedItems.includes(originalIndex);
                                return (
                                    <motion.tr
                                        key={`${book.id}-${format}-${originalIndex}`}
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        className={`${isSelected ? 'bg-blue-50 dark:bg-blue-900/20' : 'bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800'}`}
                                    >
                                        <td className="px-3 py-3">
                                            <input
                                                type="checkbox"
                                                checked={isSelected}
                                                onChange={() => toggleCartItem(originalIndex)}
                                                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-slate-300 dark:border-slate-600 rounded"
                                            />
                                        </td>
                                        <td className="px-3 py-3 text-slate-900 dark:text-slate-100 max-w-xs truncate" title={book.title}>
                                            {book.title}
                                        </td>
                                        <td className="px-3 py-3 text-slate-600 dark:text-slate-400 hidden sm:table-cell truncate max-w-[150px]" title={book.authors?.join(', ')}>
                                            {book.authors?.[0] || '-'}
                                        </td>
                                        <td className="px-3 py-3 text-slate-600 dark:text-slate-400 hidden md:table-cell truncate max-w-[150px]" title={book.publisher}>
                                            {book.publisher || '-'}
                                        </td>
                                        <td className="px-3 py-3 text-slate-600 dark:text-slate-400 hidden lg:table-cell">
                                            {language || '-'}
                                        </td>
                                        <td className="px-3 py-3 text-slate-600 dark:text-slate-400 hidden xl:table-cell truncate max-w-[120px]" title={book.categories?.join(', ')}>
                                            {book.categories?.[0] || '-'}
                                        </td>
                                        <td className="px-3 py-3">
                                            <span className={`px-2 py-1 rounded text-xs font-medium ${format === 'pdf'
                                                ? 'bg-green-100 dark:bg-green-900/50 text-green-800 dark:text-green-200'
                                                : 'bg-blue-100 dark:bg-blue-900/50 text-blue-800 dark:text-blue-200'
                                                }`}>
                                                {format.toUpperCase()}
                                            </span>
                                        </td>
                                        <td className="px-3 py-3">
                                            <button
                                                onClick={() => removeFromCart(originalIndex)}
                                                className="text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300"
                                                title="Remove from cart"
                                            >
                                                <TrashIcon className="h-4 w-4" />
                                            </button>
                                        </td>
                                    </motion.tr>
                                );
                            })
                        )}
                    </tbody>
                </table>
            </div>

            {/* Bottom pagination */}
            <div className="flex items-center justify-center gap-2 mt-4 flex-shrink-0">
                <button
                    disabled={cartPage <= 1}
                    onClick={() => setCartPage(cartPage - 1)}
                    className="px-3 py-1 bg-slate-100 dark:bg-slate-700 rounded disabled:opacity-50 text-sm text-slate-700 dark:text-slate-300"
                >
                    Previous
                </button>
                <span className="text-sm text-slate-600 dark:text-slate-400">
                    Page {cartPage} of {totalPages}
                </span>
                <button
                    disabled={cartPage >= totalPages}
                    onClick={() => setCartPage(cartPage + 1)}
                    className="px-3 py-1 bg-slate-100 dark:bg-slate-700 rounded disabled:opacity-50 text-sm text-slate-700 dark:text-slate-300"
                >
                    Next
                </button>
            </div>
        </div>
    );
};

export default CartTable;
