import { motion } from "framer-motion";
import CheckboxFilterSection from "./CheckboxFilterSection";
import { useAppContext } from "../context/AppContext";

const FiltersSidebar = () => {
  const {
    filters,
    facets,
    availableLanguages,
    selected,
    setSelected,
  } = useAppContext();

  const handleToggle = (category, value, add) => {
    setSelected((prev) => {
      const current = prev?.[category] || [];
      const updated = add
        ? [...current, value]
        : current.filter((v) => v !== value);

      return { ...prev, [category]: updated };
    });
  };

  // Filter configuration (removed languages)
  const filterConfig = [
    { key: "authors", title: "Authors" },
    { key: "publishers", title: "Publishers" },
    { key: "categories", title: "Categories" },
  ];

  const languageItems = Object.keys(facets.languages || {}).map((lang) => ({
    id: lang,
    name: lang,
  }));

  return (
    <motion.aside
      initial={{ x: -10, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      className="w-full p-4 bg-white dark:bg-slate-900 rounded-xl shadow-md overflow-y-auto max-h-[70vh] sm:max-h-[80vh]"
    >
      <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-100 mb-3">Filters</h2>
      {/* LANGUAGE (single-select, catalog-driven) */}

      <CheckboxFilterSection
        title="Language"
        items={languageItems}
        facets={facets.languages} // language counts are irrelevant here
        selectedValues={
          selected.language ? [selected.language] : []
        }
        singleSelect
        onToggle={(value) =>
          setSelected({
            language: value,
            authors: [],
            publishers: [],
            categories: [],
            readingLevels: [],
            q: "",
            page: 1,
          })
        }
        getItemValue={(item) => item.id}
        getItemLabel={(item) => item.name}
      />

      {filterConfig.map(({ key, title }) => {
        // Get items from filters object
        const items = filters?.[key] || [];
        // Convert simple array to object format for display
        const formattedItems = Array.isArray(items) ? items.map(item => ({ name: item, id: item })) : [];
        const facet =
          key === "language"
            ? {}              // ← language has no counts
            : facets?.[key] || {};
        const selectedValues =
          key === "language"
            ? selected.language
              ? [selected.language]
              : []
            : selected?.[key] || [];

        // Debugging helper (only logs in dev)
        if (process.env.NODE_ENV === "development") {
          console.log(`[${key}] items:`, items, "facet:", facet);
        }

        return (
          <CheckboxFilterSection
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