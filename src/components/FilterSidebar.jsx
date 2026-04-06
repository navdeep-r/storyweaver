/**
 * FilterSidebar.jsx — Browse Mode Filter Sidebar
 *
 * Renders the filter panel for the main book browsing view. Contains:
 *
 * 1. **Language filter** (single-select): Selecting a language resets all
 *    other filters and triggers a new API call for that language's catalog.
 *    Uses CheckboxFilterSection with singleSelect mode.
 *
 * 2. **Author/Publisher/Category filters** (multi-select): Each uses
 *    CheckboxFilterSection with facet counts from the current language feed.
 *
 * The sidebar slides in with a Framer Motion animation and is scrollable
 * on smaller screens (max-height constrained).
 */

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

  /**
   * Toggle a multi-select filter value on or off.
   * Dispatches an updater function to setSelected to toggle the value
   * in the appropriate filter array.
   *
   * @param {string} category - Filter category key (e.g., "authors").
   * @param {string} value - The filter value to toggle.
   * @param {boolean} add - Whether to add (true) or remove (false) the value.
   */
  const handleToggle = (category, value, add) => {
    setSelected((prev) => {
      const current = prev?.[category] || [];
      const updated = add
        ? [...current, value]
        : current.filter((v) => v !== value);

      return { ...prev, [category]: updated };
    });
  };

  // Configuration for the multi-select filter sections
  const filterConfig = [
    { key: "authors", title: "Authors" },
    { key: "publishers", title: "Publishers" },
    { key: "categories", title: "Categories" },
  ];

  // Transform language facet keys into items for the CheckboxFilterSection
  const languageItems = Object.keys(facets.languages || {}).map((lang) => ({
    id: lang,
    name: lang.replace(/\s*\(\s*\)$/, ''), // Strip empty parentheses from display
  }));

  return (
    <motion.aside
      initial={{ x: -10, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      className="w-full p-4 bg-white dark:bg-slate-900 rounded-xl shadow-md overflow-y-auto max-h-[70vh] sm:max-h-[80vh]"
    >
      <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-100 mb-3">Filters</h2>

      {/*
       * Language filter — single-select mode.
       * Selecting a language resets all other filter dimensions and
       * triggers a full data refresh for that language's catalog.
       */}
      <CheckboxFilterSection
        title="Language"
        items={languageItems}
        facets={facets.languages}
        selectedValues={
          selected.language ? [selected.language] : []
        }
        singleSelect
        showCounts={false}
        hideSelectAll
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

      {/* Multi-select filters for authors, publishers, and categories */}
      {filterConfig.map(({ key, title }) => {
        const items = filters?.[key] || [];
        const formattedItems = Array.isArray(items) ? items.map(item => ({ name: item, id: item })) : [];
        const facet =
          key === "language"
            ? {}
            : facets?.[key] || {};
        const selectedValues =
          key === "language"
            ? selected.language
              ? [selected.language]
              : []
            : selected?.[key] || [];

        // Development-only debug logging
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