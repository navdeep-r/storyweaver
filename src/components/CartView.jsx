import { useEffect } from 'react';
import { useAppContext } from '../context/AppContext';
import CartHeader from './CartHeader';
import CartFilterSidebar from './CartFilterSidebar';
import CartTable from './CartTable';

const CartView = ({ onClose }) => {
    const { cart } = useAppContext();

    // Close cart overlay on Escape when not focused on an input
    useEffect(() => {
        const handleEscape = (e) => {
            if (e.key === 'Escape') {
                const activeEl = document.activeElement;
                const isInputFocused = activeEl && (
                    activeEl.tagName === 'INPUT' ||
                    activeEl.tagName === 'TEXTAREA' ||
                    activeEl.isContentEditable
                );
                if (!isInputFocused) {
                    onClose();
                }
            }
        };
        document.addEventListener('keydown', handleEscape);
        return () => document.removeEventListener('keydown', handleEscape);
    }, [onClose]);

    return (
        <div className="fixed inset-0 z-30 overflow-hidden bg-white dark:bg-slate-900">
            <CartHeader onClose={onClose} />

            <div className="container mx-auto px-4 py-6 h-[calc(100vh-80px)] overflow-hidden">
                {cart.length === 0 ? (
                    <div className="text-center py-12">
                        <svg className="mx-auto h-12 w-12 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                        </svg>
                        <h3 className="mt-2 text-sm font-medium text-slate-900 dark:text-slate-300">Your cart is empty</h3>
                        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Add some books to get started.</p>
                        <button
                            onClick={onClose}
                            className="mt-4 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
                        >
                            Browse Books
                        </button>
                    </div>
                ) : (
                    <div className="flex flex-col lg:flex-row gap-6 h-full">
                        {/* Filter sidebar */}
                        <div className="w-full lg:w-1/4 lg:max-h-full lg:overflow-y-auto">
                            <CartFilterSidebar />
                        </div>

                        {/* Main content area */}
                        <div className="w-full lg:w-3/4 flex flex-col min-h-0">
                            <CartTable />
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default CartView;
