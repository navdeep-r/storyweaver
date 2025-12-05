import { motion } from "framer-motion";
import { useAppContext } from "../context/AppContext";
import FilterSection from "./_FilterSection";  // new file

const FiltersSidebar = () => {
    const { filters, facets, selectedFilters, setSelectedFilters } =
        useAppContext();

    const toggle = (category, value, add) => {
        if (category === "languages") {
            setSelectedFilters((prev) => ({
                language: add ? value : undefined,
                authors: [],
                publishers: [],
                categories: [],
                search: prev.search,
            }));
            return;
        }

        setSelectedFilters((prev) => {
            const current = prev[category] || [];
            return {
                ...prev,
                [category]: add
                    ? [...current, value]
                    : current.filter((v) => v !== value),
            };
        });
    };

    const config = [
        { key: "languages", title: "Languages" },
        { key: "authors", title: "Authors" },
        { key: "publishers", title: "Publishers" },
        { key: "categories", title: "Categories" },
    ];

    return (
        <motion.div
            initial={{ x: -10, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ duration: 0.3 }}
            className="bg-white dark:bg-slate-900 rounded-xl shadow-md p-4 
                 border border-slate-200 dark:border-slate-700
                 w-full max-w-[280px]"
        >
            <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100 mb-4">
                Filters
            </h2>

            {config.map(({ key, title }) => {
                const items = filters[key] || [];
                const formatted = items.map((v) => ({ id: v, name: v }));
                const selected =
                    key === "languages"
                        ? selectedFilters.language
                            ? [selectedFilters.language]
                            : []
                        : selectedFilters[key] || [];

                return (
                    <FilterSection
                        key={key}
                        title={title}
                        items={formatted}
                        facets={facets[key] || {}}
                        selectedValues={selected}
                        onToggle={(value, add) => toggle(key, value, add)}
                        getItemValue={(item) => item.id}
                        getItemLabel={(item) => item.name}
                    />
                );
            })}
        </motion.div>
    );
};

export default FiltersSidebar;
