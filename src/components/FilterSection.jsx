/**
 * FilterSection.jsx — Button-Based Collapsible Filter
 *
 * A generic, animated filter dropdown component that uses toggle buttons
 * (rather than checkboxes) for selection. This is the simpler alternative
 * to CheckboxFilterSection and is available as a lower-level building block.
 *
 * Features:
 * - Smooth expand/collapse animations (Framer Motion)
 * - Highlighted active filters with blue background
 * - Keyboard accessibility (tab-focusable, visible focus ring)
 * - Smart sorting by facet count (most popular items first)
 * - Defensive data handling for undefined/null inputs
 * - Facet count badges on each option
 *
 * @param {Object} props
 * @param {string} props.title - Section heading text.
 * @param {Array} props.items - Filter option items.
 * @param {Object} props.facets - Facet counts: { [label]: count }.
 * @param {Array} props.selectedValues - Currently selected value labels.
 * @param {Function} props.onToggle - Callback: (label, isSelected) => void.
 * @param {Function} props.getItemValue - Extract unique value from an item.
 * @param {Function} props.getItemLabel - Extract display label from an item.
 */

import { useState, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDownIcon as ChevronDown } from '@heroicons/react/24/solid';

const FilterSection = ({
  title,
  items = [],
  facets = {},
  selectedValues = [],
  onToggle,
  getItemValue,
  getItemLabel
}) => {
  const [isExpanded, setIsExpanded] = useState(true);

  /**
   * Handle filter item click — toggles selection state.
   * Determines if the item is currently selected and inverts it.
   */
  const handleItemClick = useCallback(
    (item) => {
      const label = getItemLabel(item);
      const selected = Array.isArray(selectedValues) && selectedValues.includes(label);
      onToggle(label, !selected);
    },
    [getItemLabel, selectedValues, onToggle]
  );

  // Sort items by facet count (descending) for better discoverability
  const sortedItems = useMemo(() => {
    const list = Array.isArray(items) ? items : [];
    return [...list].sort((a, b) => {
      const aLabel = getItemLabel(a);
      const bLabel = getItemLabel(b);
      const countA = facets[aLabel] || 0;
      const countB = facets[bLabel] || 0;
      return countB - countA;
    });
  }, [items, facets, getItemLabel]);

  // Framer Motion animation variants for the list container
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
        {/* Animated chevron rotates 180° when expanded */}
        <motion.div
          animate={{ rotate: isExpanded ? 180 : 0 }}
          transition={{ duration: 0.2 }}
        >
          <ChevronDown className="w-5 h-5 text-slate-400 dark:text-slate-300" />
        </motion.div>
      </button>

      {/* Expandable filter options list */}
      <AnimatePresence initial={false}>
        {isExpanded && (
          <motion.div
            key="list"
            variants={listVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            className="mt-3 space-y-2 max-h-64 overflow-y-auto pr-1 custom-scrollbar"
          >
            {sortedItems.length === 0 ? (
              <div className="text-sm text-slate-400 italic px-2 py-1">
                No options available
              </div>
            ) : (
              sortedItems.map((item) => {
                const label = getItemLabel(item);
                const value = getItemValue(item);
                const count = facets[label] || 0;
                const isSelected =
                  Array.isArray(selectedValues) && selectedValues.includes(label);

                return (
                  <motion.button
                    key={value || label}
                    onClick={() => handleItemClick(item)}
                    whileTap={{ scale: 0.97 }}
                    className={`flex items-center justify-between w-full px-3 py-2 rounded-lg text-sm font-medium transition-all focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-slate-900
                      ${isSelected
                        ? 'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 shadow-sm'
                        : 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300'
                      }
                    `}
                  >
                    <span className="truncate">{label}</span>
                    {/* Facet count badge */}
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full ${isSelected
                        ? 'bg-blue-200 dark:bg-blue-800 text-blue-700 dark:text-blue-300'
                        : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
                        }`}
                    >
                      {count}
                    </span>
                  </motion.button>
                );
              })
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default FilterSection;
