import { motion } from 'framer-motion';
import CheckboxFilterSection from './CheckboxFilterSection';
import { useAppContext } from '../context/AppContext';

const CartFilterSidebar = () => {
    const {
        cartFacets,
        cartSelected,
        setCartSelected,
    } = useAppContext();

    const handleToggle = (category, value, add) => {
        setCartSelected((prev) => {
            const current = prev?.[category] || [];
            const updated = add
                ? [...current, value]
                : current.filter((v) => v !== value);

            return { ...prev, [category]: updated };
        });
    };

    // Filter configuration for cart (excludes book name - handled by search)
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
                // Get facets from cartFacets (counts of each value in cart)
                const facet = cartFacets?.[key] || {};
                const items = Object.keys(facet).map((name) => ({ id: name, name }));
                const selectedValues = cartSelected?.[key] || [];

                // Skip empty filter sections
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

            {/* Show message if no filters available */}
            {filterConfig.every(({ key }) => Object.keys(cartFacets?.[key] || {}).length === 0) && (
                <div className="text-sm text-slate-400 italic py-4">
                    No filters available
                </div>
            )}
        </motion.aside>
    );
};

export default CartFilterSidebar;
