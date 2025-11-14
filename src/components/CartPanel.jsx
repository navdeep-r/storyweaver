import { useState } from 'react';
import { useAppContext } from '../context/AppContext';
import { XMarkIcon, ShoppingBagIcon } from '@heroicons/react/24/outline';

const CartPanel = () => {
  const { cart, removeFromCart, clearCart } = useAppContext();
  const [isOpen, setIsOpen] = useState(false);

  const handleCheckout = () => {
    // In a real app, this would process the checkout
    alert(`Processing download for ${cart.length} items!`);
    clearCart();
    setIsOpen(false);
  };

  return (
    <>
      {/* Floating cart button */}
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 bg-blue-500 text-white rounded-full p-4 shadow-lg hover:bg-blue-600 transition-colors z-20"
      >
        <div className="relative">
          <ShoppingBagIcon className="h-6 w-6" />
          {cart.length > 0 && (
            <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
              {cart.length}
            </span>
          )}
        </div>
      </button>

      {/* Cart panel */}
      {isOpen && (
        <div className="fixed inset-0 z-30 overflow-hidden">
          <div
            className="absolute inset-0 bg-black bg-opacity-50 transition-opacity"
            onClick={() => setIsOpen(false)}
          />

          <div className="absolute inset-y-0 right-0 max-w-full flex">
            <div className="relative w-screen max-w-md">
              <div className="h-full flex flex-col bg-white shadow-xl">
                <div className="flex-1 overflow-y-auto py-6 px-4 sm:px-6">
                  <div className="flex items-start justify-between">
                    <h2 className="text-lg font-medium text-slate-900">Your Selection</h2>
                    <button
                      onClick={() => setIsOpen(false)}
                      className="ml-3 h-7 flex items-center justify-center rounded-md text-slate-400 hover:text-slate-500"
                    >
                      <XMarkIcon className="h-6 w-6" />
                    </button>
                  </div>

                  <div className="mt-8">
                    {cart.length === 0 ? (
                      <div className="text-center py-12">
                        <ShoppingBagIcon className="mx-auto h-12 w-12 text-slate-400" />
                        <h3 className="mt-2 text-sm font-medium text-slate-900">Your cart is empty</h3>
                        <p className="mt-1 text-sm text-slate-500">Add some books to get started.</p>
                      </div>
                    ) : (
                      <div className="flow-root">
                        <ul className="-my-6 divide-y divide-slate-200">
                          {cart.map((item, index) => (
                            <li key={index} className="py-6 flex">
                              <div className="shrink-0 w-24 h-32 bg-slate-200 rounded-md overflow-hidden">
                                {item.book.coverUrl ? (
                                  <img
                                    src={item.book.coverUrl}
                                    alt={item.book.title}
                                    className="w-full h-full object-cover"
                                  />
                                ) : (
                                  <div className="w-full h-full flex items-center justify-center">
                                    <svg className="w-6 h-6 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                                    </svg>
                                  </div>
                                )}
                              </div>

                              <div className="ml-4 flex-1 flex flex-col">
                                <div>
                                  <div className="flex justify-between text-base font-medium text-slate-900">
                                    <h3 className="line-clamp-2">{item.book.title}</h3>
                                  </div>
                                  <p className="mt-1 text-sm text-slate-500">
                                    {item.book.authors.length > 0 && `by ${item.book.authors[0]}`}
                                  </p>
                                  <p className="mt-1 text-sm text-slate-500">
                                    Format: {item.format}
                                  </p>
                                </div>
                                <div className="flex-1 flex items-end justify-between text-sm">
                                  <button
                                    onClick={() => removeFromCart(index)}
                                    className="font-medium text-blue-600 hover:text-blue-500"
                                  >
                                    Remove
                                  </button>
                                </div>
                              </div>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </div>

                {cart.length > 0 && (
                  <div className="border-t border-slate-200 py-6 px-4 sm:px-6">
                    <div className="flex justify-between text-base font-medium text-slate-900">
                      <p>Items ({cart.length})</p>
                    </div>
                    <div className="mt-6">
                      <button
                        onClick={handleCheckout}
                        className="w-full flex justify-center items-center px-6 py-3 border border-transparent rounded-md shadow-sm text-base font-medium text-white bg-blue-600 hover:bg-blue-700"
                      >
                        Download Selected
                      </button>
                    </div>
                    <div className="mt-4 flex justify-center">
                      <button
                        onClick={clearCart}
                        className="text-sm font-medium text-slate-600 hover:text-slate-500"
                      >
                        Clear Selection
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default CartPanel;