/**
 * CartPanel.jsx — Floating Cart Button & Overlay Toggle
 *
 * Renders a floating action button (FAB) in the bottom-right corner
 * of the screen. Displays the current cart item count as a badge.
 * Clicking the button opens the full-page CartView overlay.
 *
 * The FAB is always visible (z-index 20) regardless of scroll position,
 * providing constant access to the cart from any point in the app.
 */

import { useState } from 'react';
import { useAppContext } from '../context/AppContext';
import { ShoppingBagIcon } from '@heroicons/react/24/outline';
import CartView from './CartView';

const CartPanel = () => {
  const { cart } = useAppContext();
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      {/* Floating cart button */}
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 bg-blue-500 text-white rounded-full p-3 sm:p-4 shadow-lg hover:bg-blue-600 transition-colors z-20"
      >
        <div className="relative">
          <ShoppingBagIcon className="h-5 w-5 sm:h-6 sm:w-6" />
          {/* Item count badge — only shown when cart has items */}
          {cart.length > 0 && (
            <span className="absolute -top-1 -right-1 sm:-top-2 sm:-right-2 bg-red-500 text-white text-xs rounded-full h-4 w-4 sm:h-5 sm:w-5 flex items-center justify-center">
              {cart.length}
            </span>
          )}
        </div>
      </button>

      {/* Full-page cart overlay — conditionally rendered */}
      {isOpen && <CartView onClose={() => setIsOpen(false)} />}
    </>
  );
};

export default CartPanel;