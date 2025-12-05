// File: src/components/AboutFooter.jsx
// New component: simple placeholder for the full-width about/contact area.

const AboutFooter = () => {
    return (
        <footer className="mt-12 py-10 bg-slate-100 dark:bg-slate-800 text-center rounded-t-2xl">
            <div className="container mx-auto px-4">
                <div className="text-slate-600 dark:text-slate-300 text-sm">
                    <p className="font-semibold mb-2">StoryWeaver Library — Prototype</p>
                    <p className="mb-2">About this project and contact information will appear here.</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">© Pratham Books / StoryWeaver (demo UI)</p>
                </div>
            </div>
        </footer>
    );
};

export default AboutFooter;