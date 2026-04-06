/**
 * CartFilterSidebar.jsx — Cart-Specific Filter Sidebar
 *
 * A filter panel that operates on the cart contents rather than the
 * full book catalog. Dynamically generates filter sections based on
 * the `cartFacets` object, which tracks counts of each language,
 * author, publisher, and category present in the cart.
 *
 * Empty filter sections (i.e., no values in that dimension) are hidden
 * automatically. If no filters are available at all, a "No filters
 * available" message is shown.
 *
 * Uses the same CheckboxFilterSection component as the browse-mode
 * sidebar for a consistent filter UX.
 */

import { motion } from 'framer-motion';
import CheckboxFilterSection from './CheckboxFilterSection';
import { useAppContext } from '../context/AppContext';

const CartFilterSidebar = () => {
    const {
        cartFacets,
        cartSelected,
        setCartSelected,
    } = useAppContext();

    /**
     * Toggle a filter value in the cart filter state.
     *
     * @param {string} category - Filter dimension key (e.g., "languages").
     * @param {string} value - The value to add or remove.
     * @param {boolean} add - True to add, false to remove.
     */
    const handleToggle = (category, value, add) => {
        setCartSelected((prev) => {
            const current = prev?.[category] || [];
            const updated = add
                ? [...current, value]
                : current.filter((v) => v !== value);

            return { ...prev, [category]: updated };
        });
    };

    // Filter dimension configuration
    const filterConfig = [
        { key: 'languages', title: 'Language' },
        { key: 'authors', title: 'Authors' },
        { key: 'publishers', title: 'Publishers' },
        { key: 'categories', title: 'Categories' },
    ];

    return (
        <motion.aside
            initial={{ x: -10, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ duration: 0.4, ease: 'easeOut' }}
            className="w-full p-4 bg-white dark:bg-slate-900 rounded-xl shadow-md overflow-y-auto max-h-[70vh] sm:max-h-[80vh]"
        >
            <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-100 mb-3">
                Filter Cart
            </h2>

            {filterConfig.map(({ key, title }) => {
                // Build items from cart facets (only values present in the cart)
                const facet = cartFacets?.[key] || {};
                const items = Object.keys(facet).map((name) => ({ id: name, name }));
                const selectedValues = cartSelected?.[key] || [];

                // Skip rendering empty filter sections
                if (items.length === 0) {
                    return null;
                }

                return (
                    <CheckboxFilterSection
                        key={key}
                        title={title}
                        items={items}
                        facets={facet}
                        selectedValues={selectedValues}
                        onToggle={(value, add) => handleToggle(key, value, add)}
                        getItemValue={(item) => item.id}
                        getItemLabel={(item) => item.name}
                    />
                );
            })}

            {/* Fallback message when no filter dimensions have values */}
            {filterConfig.every(({ key }) => Object.keys(cartFacets?.[key] || {}).length === 0) && (
                <div className="text-sm text-slate-400 italic py-4">
                    No filters available
                </div>
            )}
        </motion.aside>
    );
};

export default CartFilterSidebar;
