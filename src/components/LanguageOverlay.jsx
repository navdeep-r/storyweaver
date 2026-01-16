import { motion } from "framer-motion";
import { useAppContext } from "../context/AppContext";

const LanguageOverlay = () => {
  const { facets, selected, setSelected } = useAppContext();
  const languages = Object.keys(facets.languages || {});

  // Do not render if language is already selected
  if (!languages.length || selected.language) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="fixed inset-0 z-50 bg-white dark:bg-slate-900 flex items-center justify-center"
    >
      <div className="max-w-3xl w-full px-6">
        <h1 className="text-2xl font-bold text-center mb-6">
          Select a Language
        </h1>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          {languages.map((lang) => (
            <button
              key={lang}
              onClick={() =>
                setSelected({
                  language: lang,
                  authors: [],
                  publishers: [],
                  categories: [],
                  readingLevels: [],
                  q: "",
                  page: 1,
                })
              }
          className="p-4 rounded-lg border bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 transition"
            >
          {lang}
        </button>
          ))}
      </div>
    </div>
    </motion.div >
  );
};

export default LanguageOverlay;
