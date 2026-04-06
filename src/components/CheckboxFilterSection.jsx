/**
 * CheckboxFilterSection.jsx — Checkbox-Based Collapsible Filter
 *
 * A feature-rich filter section component that uses checkboxes for
 * multi-selection. Used throughout the app for filtering books by
 * language, author, publisher, category, etc.
 *
 * Features:
 * - Checkbox-based selection (better UX than toggle buttons)
 * - Built-in search input to quickly find options in large lists
 * - Select-all checkbox for visible items (can be hidden via prop)
 * - Smooth expand/collapse animation (Framer Motion)
 * - Smart sorting: selected items first, then by facet count
 * - Performance cap: limits rendered items to MAX_ITEMS (100) to
 *   prevent lag with very large filter lists
 * - Keyboard accessibility (Escape clears search)
 *
 * @param {Object} props
 * @param {string} props.title - Section heading text.
 * @param {Array} props.items - Filter option items.
 * @param {Object} props.facets - Facet counts: { [label]: count }.
 * @param {Array} props.selectedValues - Currently selected value labels.
 * @param {Function} props.onToggle - Callback: (value, isChecked) => void.
 * @param {Function} props.getItemValue - Extract unique value from an item.
 * @param {Function} props.getItemLabel - Extract display label from an item.
 * @param {boolean} [props.showCounts=true] - Whether to show facet counts.
 * @param {boolean} [props.hideSelectAll=false] - Whether to hide the select-all checkbox.
 */

import { useState, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDownIcon as ChevronDown } from '@heroicons/react/24/solid';

const CheckboxFilterSection = ({
  title,
  items = [],
  facets = {},
  selectedValues = [],
  onToggle,
  getItemValue,
  getItemLabel,
  showCounts = true,
  hideSelectAll = false,
}) => {
  const [isExpanded, setIsExpanded] = useState(true);
  const [search, setSearch] = useState("");

  /**
   * Handle individual checkbox change.
   * Maps the item to its label and forwards to the parent callback.
   */
  const handleCheckboxChange = useCallback(
    (item, isChecked) => {
      const label = getItemLabel(item);
      onToggle(label, isChecked);
    },
    [getItemLabel, onToggle]
  );

  // Filter items based on the local search query
  const filteredItems = useMemo(() => {
    const query = search.toLowerCase().trim();
    const list = Array.isArray(items) ? items : [];
    if (!query) return list;
    return list.filter((item) =>
      getItemLabel(item).toLowerCase().includes(query)
    );
  }, [items, search, getItemLabel]);

  /**
   * Sort and cap the filtered items for rendering.
   * - Selected items always appear first
   * - Within each group, items are sorted by facet count (descending)
   * - Total capped at MAX_ITEMS to prevent rendering lag
   */
  const MAX_ITEMS = 100;

  const sortedItems = useMemo(() => {
    const sortByCount = (a, b) => {
      const countA = facets[getItemLabel(a)] || 0;
      const countB = facets[getItemLabel(b)] || 0;
      return countB - countA;
    };

    // Partition into selected and non-selected groups
    const selected = filteredItems.filter((item) =>
      selectedValues.includes(getItemLabel(item))
    );
    const nonSelected = filteredItems.filter((item) =>
      !selectedValues.includes(getItemLabel(item))
    );

    const sortedSelected = selected.sort(sortByCount);
    const sortedNonSelected = nonSelected.sort(sortByCount);

    // Always show all selected items, fill remaining slots with top non-selected
    const remainingSlots = Math.max(0, MAX_ITEMS - sortedSelected.length);
    return [...sortedSelected, ...sortedNonSelected.slice(0, remainingSlots)];
  }, [filteredItems, facets, getItemLabel, selectedValues]);

  // Framer Motion animation variants for expand/collapse
  const listVariants = {
    hidden: { opacity: 0, height: 0 },
    visible: {
      opacity: 1,
      height: 'auto',
      transition: { duration: 0.25, ease: 'easeOut' }
    },
    exit: { opacity: 0, height: 0, transition: { duration: 0.2, ease: 'easeIn' } }
  };

  return (
    <div className="border-b border-slate-200 dark:border-slate-700 pb-5 last:border-none">
      {/* Collapsible section header */}
      <button
        onClick={() => setIsExpanded((p) => !p)}
        className="flex items-center justify-between w-full group"
        aria-expanded={isExpanded}
      >
        <h3 className="text-base font-semibold text-slate-700 dark:text-slate-200 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
          {title}
        </h3>
        <motion.div
          animate={{ rotate: isExpanded ? 180 : 0 }}
          transition={{ duration: 0.2 }}
        >
          <ChevronDown className="w-5 h-5 text-slate-400 dark:text-slate-300" />
        </motion.div>
      </button>

      {/* Expandable content area */}
      <AnimatePresence initial={false}>
        {isExpanded && (
          <motion.div
            key="list"
            variants={listVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            className="mt-3"
          >
            {/* Search input row with optional select-all checkbox */}
            <div className="flex items-center gap-3 mb-3">
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={(e) => e.key === 'Escape' && setSearch('')}
                placeholder={`Search ${title.toLowerCase()}...`}
                className="block flex-1 px-3 py-2
                  border border-slate-300 dark:border-slate-600
                  rounded-lg
                  bg-white dark:bg-slate-800
                  text-sm text-slate-900 dark:text-slate-100
                  placeholder-slate-500 dark:placeholder-slate-400
                  focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500
                  transition-all duration-200"
              />
              {/* Select-all checkbox: toggles all visible items */}
              {!hideSelectAll && (
                <input
                  type="checkbox"
                  checked={sortedItems.length > 0 && sortedItems.every((item) =>
                    selectedValues.includes(getItemLabel(item))
                  )}
                  onChange={(e) => {
                    const isChecking = e.target.checked;
                    sortedItems.forEach((item) => {
                      const label = getItemLabel(item);
                      const isCurrentlySelected = selectedValues.includes(label);
                      if (isChecking && !isCurrentlySelected) {
                        onToggle(label, true);
                      } else if (!isChecking && isCurrentlySelected) {
                        onToggle(label, false);
                      }
                    });
                  }}
                  className="h-4 w-4 text-blue-600 dark:text-blue-400 focus:ring-blue-500 dark:focus:ring-blue-400 border-slate-300 dark:border-slate-600 rounded"
                  title="Select all visible"
                />
              )}
            </div>

            {/* Scrollable list of filter options */}
            <div className="space-y-2 max-h-48 overflow-y-auto pr-1 custom-scrollbar">
              {sortedItems.length === 0 ? (
                <div className="text-sm text-slate-400 italic px-2 py-1">
                  {search ? "No matching items" : "No options available"}
                </div>
              ) : (
                sortedItems.map((item) => {
                  const label = getItemLabel(item);
                  const value = getItemValue(item);
                  const count = facets[label] || 0;
                  const isSelected =
                    Array.isArray(selectedValues) && selectedValues.includes(label);

                  return (
                    <div
                      key={value || label}
                      className={`flex items-center justify-between w-full px-3 py-2 rounded-lg transition-all ${isSelected
                        ? 'bg-blue-100 dark:bg-blue-900/40'
                        : 'hover:bg-slate-100 dark:hover:bg-slate-800'
                        }`}
                    >
                      <label className="flex items-center cursor-pointer w-full">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={(e) => handleCheckboxChange(item, e.target.checked)}
                          className="h-4 w-4 text-blue-600 dark:text-blue-400 focus:ring-blue-500 dark:focus:ring-blue-400 border-slate-300 dark:border-slate-600 rounded"
                        />
                        <span className="ml-2 text-sm font-medium text-slate-700 dark:text-slate-300 truncate">
                          {label}
                        </span>
                      </label>
                      {/* Facet count badge (optional via showCounts prop) */}
                      {showCounts && (
                        <span
                          className={`text-xs px-2 py-0.5 rounded-full ${isSelected
                            ? 'bg-blue-200 dark:bg-blue-800 text-blue-700 dark:text-blue-300'
                            : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
                            }`}
                        >
                          {count}
                        </span>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default CheckboxFilterSection;