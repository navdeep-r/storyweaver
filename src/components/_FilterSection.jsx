// NEW FilterSection.jsx (works with the new layout + search + scroll limit)

import { useState, useMemo, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDownIcon as ChevronDown } from "@heroicons/react/24/solid";

const FilterSection = ({
    title,
    items = [],
    facets = {},
    selectedValues = [],
    onToggle,
    getItemValue,
    getItemLabel,
}) => {
    const [isExpanded, setIsExpanded] = useState(title === "Languages");
    const [search, setSearch] = useState("");

    // Filter items based on search
    const filteredItems = useMemo(() => {
        const query = search.toLowerCase().trim();
        const list = Array.isArray(items) ? items : [];

        return list.filter((item) =>
            getItemLabel(item).toLowerCase().includes(query)
        );
    }, [items, search, getItemLabel]);

    // Sort by facet counts
    const sortedItems = useMemo(() => {
        return [...filteredItems].sort((a, b) => {
            const al = getItemLabel(a);
            const bl = getItemLabel(b);
            return (facets[bl] || 0) - (facets[al] || 0);
        });
    }, [filteredItems, facets, getItemLabel]);

    const handleItemClick = useCallback(
        (item) => {
            const label = getItemLabel(item);
            const selected =
                Array.isArray(selectedValues) && selectedValues.includes(label);
            onToggle(label, !selected);
        },
        [getItemLabel, selectedValues, onToggle]
    );

    return (
        <div className="border-b border-slate-200 dark:border-slate-700 sepia:border-sepia-400 pb-4">
            {/* Header */}
            <button
                className="flex justify-between w-full group"
                onClick={() => setIsExpanded(!isExpanded)}
            >
                <h3 className="
                text-sm font-bold
                text-slate-700 
                dark:text-slate-100 
                sepia:text-sepia-900
                group-hover:text-blue-600 
                dark:group-hover:text-blue-400
                ">
                    {title}
                </h3>

                <motion.div
                    animate={{ rotate: isExpanded ? 180 : 0 }}
                    transition={{ duration: 0.2 }}
                >
                    <ChevronDown className="
                    w-4 h-4
                    text-slate-500
                    dark:text-slate-300
                    sepia:text-sepia-700
                " />
                </motion.div>
            </button>

            <AnimatePresence initial={false}>
                {isExpanded && (
                    <motion.div
                        key="content"
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.2 }}
                        className="mt-3"
                    >
                        {/* Search box */}
                        <input
                            type="text"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder={`Search ${title.toLowerCase()}...`}
                            className="
                w-full px-3 py-1.5 mb-3 rounded-lg 
                bg-slate-100 dark:bg-slate-800
                text-sm text-slate-700 dark:text-slate-200
                focus:ring-2 focus:ring-blue-500
                outline-none
              "
                        />

                        {/* Results (visible max ~3 items + scroll) */}
                        <div className="max-h-[150px] overflow-y-auto space-y-2 pr-1 custom-scrollbar">
                            {sortedItems.length === 0 && (
                                <div className="text-xs italic text-slate-400">
                                    No matching items
                                </div>
                            )}

                            {sortedItems.map((item) => {
                                const label = getItemLabel(item);
                                const value = getItemValue(item);
                                const isSelected = selectedValues.includes(label);
                                const count = facets[label] || 0;

                                return (
                                    <motion.button
                                        key={value}
                                        onClick={() => handleItemClick(item)}
                                        whileTap={{ scale: 0.97 }}
                                        className={`
                      flex w-full justify-between items-center px-3 py-2 rounded-lg text-sm 
                      transition-all 
                      ${isSelected
                                                ? "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300"
                                                : "hover:bg-slate-100 dark:hover:bg-slate-800"
                                            }
                    `}
                                    >
                                        <span className="truncate">{label}</span>

                                        <span
                                            className={`
                        text-xs px-2 py-0.5 rounded-full 
                        ${isSelected
                                                    ? "bg-blue-200 dark:bg-blue-800 text-blue-700 dark:text-blue-300"
                                                    : "bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300"
                                                }
                      `}
                                        >
                                            {count}
                                        </span>
                                    </motion.button>
                                );
                            })}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default FilterSection;