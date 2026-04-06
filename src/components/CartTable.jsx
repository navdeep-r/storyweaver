/**
 * CartTable.jsx — Paginated Cart Data Table
 *
 * Renders the cart contents as a tabular data grid with full CRUD-like
 * functionality. Operates entirely client-side on the cart array from context.
 *
 * Features:
 * - Client-side filtering by search term, language, author, publisher, category
 * - Pagination with configurable page size (default 100 items/page)
 * - Row selection via checkboxes (individual and select-all)
 * - Bulk remove for selected items
 * - "Download All" and "Clear All" actions
 * - Responsive column visibility: columns hide progressively on smaller screens
 * - Framer Motion row enter animations
 *
 * The table maintains the original cart indices (`originalIndex`) through
 * filtering and pagination so that remove operations target the correct items.
 */

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

    /**
     * Apply all active cart filters to produce the visible item list.
     * Each item is annotated with its originalIndex in the cart array
     * so that remove operations can target the correct position.
     */
    const filteredCart = useMemo(() => {
        return cart.map((item, originalIndex) => ({ ...item, originalIndex }))
            .filter(({ book, language }) => {
                // Search filter — matches against book title only
                if (cartSelected.searchTerm) {
                    const searchLower = cartSelected.searchTerm.toLowerCase();
                    if (!book.title?.toLowerCase().includes(searchLower)) {
                        return false;
                    }
                }

                // Language filter — uses the stored language from the cart item
                if (cartSelected.languages?.length > 0) {
                    if (!language || !cartSelected.languages.includes(language)) {
                        return false;
                    }
                }

                // Author filter — matches the first author
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

                // Category filter — matches the first category
                if (cartSelected.categories?.length > 0) {
                    const bookCategory = book.categories?.[0];
                    if (!bookCategory || !cartSelected.categories.includes(bookCategory)) {
                        return false;
                    }
                }

                return true;
            });
    }, [cart, cartSelected]);

    // Pagination calculations
    const totalPages = Math.max(1, Math.ceil(filteredCart.length / cartPerPage));
    const startIndex = (cartPage - 1) * cartPerPage;
    const paginatedCart = filteredCart.slice(startIndex, startIndex + cartPerPage);

    // Track which original indices are visible on the current page (for select-all)
    const visibleOriginalIndices = paginatedCart.map(item => item.originalIndex);

    // Check if all visible items are currently selected
    const allVisibleSelected = visibleOriginalIndices.length > 0 &&
        visibleOriginalIndices.every(i => cartSelectedItems.includes(i));

    /** Toggle select-all: selects all visible items, or clears selection if all are selected */
    const handleSelectAll = () => {
        if (allVisibleSelected) {
            clearCartSelection();
        } else {
            selectAllCartItems(visibleOriginalIndices);
        }
    };

    /** Remove all selected items from the cart */
    const handleBulkRemove = () => {
        if (cartSelectedItems.length === 0) return;
        bulkRemoveFromCart(cartSelectedItems);
    };

    /** Placeholder for download functionality */
    const handleDownloadAll = () => {
        // TODO: Implement actual download logic
        alert(`Downloading ${cart.length} items...`);
    };

    const selectedCount = cartSelectedItems.length;

    return (
        <div className="flex flex-col h-full">
            {/* Controls bar: item count, action buttons, and pagination */}
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
                    {/* Download all action */}
                    <button
                        onClick={handleDownloadAll}
                        disabled={cart.length === 0}
                        className="px-2 py-1 sm:px-3 sm:py-1 bg-blue-100 dark:bg-blue-900/50 text-blue-800 dark:text-blue-200 rounded hover:bg-blue-200 dark:hover:bg-blue-800 disabled:opacity-50 text-xs flex items-center gap-1"
                    >
                        <ArrowDownTrayIcon className="h-4 w-4" />
                        Download All
                    </button>

                    {/* Clear all items from cart */}
                    <button
                        onClick={clearCart}
                        disabled={cart.length === 0}
                        className="px-2 py-1 sm:px-3 sm:py-1 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded hover:bg-slate-200 dark:hover:bg-slate-600 disabled:opacity-50 text-xs"
                    >
                        Clear All
                    </button>

                    {/* Bulk remove — only visible when items are selected */}
                    {selectedCount > 0 && (
                        <button
                            onClick={handleBulkRemove}
                            className="px-2 py-1 sm:px-3 sm:py-1 bg-red-100 dark:bg-red-900/50 text-red-800 dark:text-red-200 rounded hover:bg-red-200 dark:hover:bg-red-800 text-xs flex items-center gap-1"
                        >
                            <TrashIcon className="h-4 w-4" />
                            Remove Selected ({selectedCount})
                        </button>
                    )}

                    {/* Top pagination */}
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

            {/* Data table */}
            <div className="flex-1 overflow-auto rounded-lg border border-slate-200 dark:border-slate-700">
                <table className="w-full text-sm">
                    {/* Table header with select-all checkbox */}
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
                            {/* Responsive columns: hidden on smaller screens */}
                            <th className="px-3 py-3 text-left font-medium text-slate-700 dark:text-slate-300 hidden sm:table-cell">Author</th>
                            <th className="px-3 py-3 text-left font-medium text-slate-700 dark:text-slate-300 hidden md:table-cell">Publisher</th>
                            <th className="px-3 py-3 text-left font-medium text-slate-700 dark:text-slate-300 hidden lg:table-cell">Language</th>
                            <th className="px-3 py-3 text-left font-medium text-slate-700 dark:text-slate-300 hidden xl:table-cell">Category</th>
                            <th className="px-3 py-3 text-left font-medium text-slate-700 dark:text-slate-300">Format</th>
                            <th className="px-3 py-3 text-left font-medium text-slate-700 dark:text-slate-300">Action</th>
                        </tr>
                    </thead>

                    {/* Table body */}
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
                                        {/* Selection checkbox */}
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
                                        {/* Format badge — colour-coded by type */}
                                        <td className="px-3 py-3">
                                            <span className={`px-2 py-1 rounded text-xs font-medium ${format === 'pdf'
                                                ? 'bg-green-100 dark:bg-green-900/50 text-green-800 dark:text-green-200'
                                                : 'bg-blue-100 dark:bg-blue-900/50 text-blue-800 dark:text-blue-200'
                                                }`}>
                                                {format.toUpperCase()}
                                            </span>
                                        </td>
                                        {/* Remove button */}
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
