import { motion } from "framer-motion";
import FilterSection from "./FilterSection";
import { useAppContext } from "../context/AppContext";

const FiltersSidebar = () => {
  const { filters, facets, selectedFilters, setSelectedFilters } = useAppContext();

  const handleToggle = (category, value, add) => {
    // 🔹 REMOVED: SINGLE-SELECT LANGUAGE FILTER
    // Language filter has been moved to a dedicated page

    // 🔹 MULTI-SELECT BEHAVIOR FOR OTHER FILTERS
    setSelectedFilters((prev) => {
      const current = prev?.[category] || [];
      const updated = add
        ? [...current, value]
        : current.filter((v) => v !== value);

      return { ...prev, [category]: updated };
    });
  };

  // Normalize key mapping (removed languages)
  const keyMap = {
    authors: "authors",
    publishers: "publishers",
    categories: "categories",
  };

  // Filter configuration (removed languages)
  const filterConfig = [
    { key: "authors", title: "Authors" },
    { key: "publishers", title: "Publishers" },
    { key: "categories", title: "Categories" },
  ];

  return (
    <motion.aside
      initial={{ x: -10, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      className="w-full md:w-72 p-4 bg-white dark:bg-slate-900 rounded-xl shadow-md overflow-y-auto max-h-[80vh]"
    >
      <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-100 mb-3">Filters</h2>

      {filterConfig.map(({ key, title }) => {
        // Get items from filters object
        const items = filters?.[key] || [];
        // Convert simple array to object format for display
        const formattedItems = Array.isArray(items) ? items.map(item => ({ name: item, id: item })) : [];
        const facet = facets?.[key] || {};
        const selectedValues = selectedFilters?.[key] || [];

        // Debugging helper (only logs in dev)
        if (process.env.NODE_ENV === "development") {
          console.log(`[${key}] items:`, items, "facet:", facet);
        }

        return (
          <FilterSection
            key={key}
            title={title}
            items={formattedItems}
            facets={facet}
            selectedValues={selectedValues}
            onToggle={(value, add) => handleToggle(key, value, add)}
            getItemValue={(item) => item.id || item.name || item}
            getItemLabel={(item) => item.name || item.label || item}
          />
        );
      })}
    </motion.aside>
  );
};

export default FiltersSidebar;