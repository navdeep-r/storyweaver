/**
 * AppContext.jsx — Global Application State
 *
 * Provides centralised state management for the entire StoryWeaver frontend
 * using React's useReducer pattern wrapped in a Context provider.
 *
 * The state is divided into three domains:
 *
 * 1. **Filter & Browse State**: Facets, active filter selections, current page,
 *    and the fetched book list. Drives the main book browsing experience.
 *
 * 2. **Cart State**: An array of collected books with their chosen format and
 *    language. Includes dedicated facets, filters, selection tracking, and
 *    pagination for the cart view.
 *
 * 3. **UI State**: Loading flag, error message, and hydration status.
 *
 * Key architectural decisions:
 * - State is persisted to sessionStorage on every change and hydrated
 *   synchronously on mount (prevents flash of empty content on refresh).
 * - The language facet list is "locked" after the initial catalog fetch to
 *   prevent it from being overwritten by language-scoped responses.
 * - Cart items use content-based hashing for deduplication rather than
 *   position-based IDs, since the same book may appear at different positions
 *   across language feeds.
 *
 * @module AppContext
 */

import {
  createContext,
  useContext,
  useEffect,
  useReducer,
} from "react";
import backendApi from "../services/backendApi";

/**
 * React Context instance for the application state.
 * Access via the useAppContext() hook.
 */
const AppContext = createContext();

/**
 * Initial state shape for the reducer.
 * All fields are documented inline for clarity.
 */
const initialState = {
  // ── Filter & Browse Architecture ──

  /** Facet counts from the API: { [facetName]: { [value]: count } } */
  facets: {
    languages: {},
    authors: {},
    publishers: {},
    categories: {},
    readingLevels: {},
  },

  /** Derived from facets: arrays of available filter values (keys) */
  filters: {
    languages: [],
    authors: [],
    publishers: [],
    categories: [],
    readingLevels: [],
  },

  /** Currently active filter selections */
  selected: {
    language: null,       // Single-select language (string or null)
    authors: [],          // Multi-select author names
    publishers: [],       // Multi-select publisher names
    categories: [],       // Multi-select category names
    readingLevels: [],    // Multi-select reading levels
    q: "",                // Free-text search query
  },

  // ── Book Data ──

  /** Current page of books returned by the API */
  books: [],
  /** Total number of matching books (for pagination) */
  total: 0,
  /** Current page number (1-indexed) */
  page: 1,
  /** Items per page */
  perPage: 50,

  // ── Cart State ──

  /** Array of cart items: { book: Object, format: string, language: string } */
  cart: [],
  /** Facet counts computed from cart contents (for cart-specific filtering) */
  cartFacets: {
    languages: {},
    authors: {},
    publishers: {},
    categories: {},
  },
  /** Active cart filter selections */
  cartSelected: {
    languages: [],
    authors: [],
    publishers: [],
    categories: [],
    searchTerm: "",
  },
  /** Indices of selected cart items (for bulk operations like remove) */
  cartSelectedItems: [],
  /** Current cart page */
  cartPage: 1,
  /** Cart items per page */
  cartPerPage: 100,

  // ── UI State ──

  /** True once sessionStorage hydration is complete (prevents overlay flash) */
  hydrated: false,
  /** True while an API request is in flight */
  loading: false,
  /** Error message string, or null */
  error: null,
};

/**
 * Derive filter option arrays from the facet counts object.
 * Each filter becomes a simple array of keys (the available values).
 *
 * @param {Object} facets - Facet counts object from the API.
 * @returns {Object} Filter arrays keyed by facet name.
 */
function buildFiltersFromFacets(facets) {
  return {
    languages: Object.keys(facets.languages || {}),
    authors: Object.keys(facets.authors || {}),
    publishers: Object.keys(facets.publishers || {}),
    categories: Object.keys(facets.categories || {}),
    readingLevels: Object.keys(facets.readingLevels || {}),
  };
}

/**
 * Update cart facet counts when a book is added or removed.
 *
 * Increments or decrements counts for the language, first author,
 * publisher, and first category of the given cart item.
 *
 * @param {Object} currentFacets - Current cart facets object.
 * @param {Object} cartItem - The cart item being added/removed.
 * @param {Object} cartItem.book - The book object.
 * @param {string} cartItem.language - The language stored with the cart item.
 * @param {number} delta - +1 for addition, -1 for removal.
 * @returns {Object} Updated cart facets (new object, does not mutate input).
 */
function updateCartFacets(currentFacets, cartItem, delta) {
  const { book, language } = cartItem;
  const newFacets = {
    languages: { ...currentFacets.languages },
    authors: { ...currentFacets.authors },
    publishers: { ...currentFacets.publishers },
    categories: { ...currentFacets.categories },
  };

  // Language comes from the cart item (stored at time of add), not the book
  if (language) {
    newFacets.languages[language] = (newFacets.languages[language] || 0) + delta;
    if (newFacets.languages[language] <= 0) delete newFacets.languages[language];
  }

  // Use only the first author for faceting
  if (book.authors?.length > 0) {
    const author = book.authors[0];
    newFacets.authors[author] = (newFacets.authors[author] || 0) + delta;
    if (newFacets.authors[author] <= 0) delete newFacets.authors[author];
  }

  if (book.publisher) {
    newFacets.publishers[book.publisher] = (newFacets.publishers[book.publisher] || 0) + delta;
    if (newFacets.publishers[book.publisher] <= 0) delete newFacets.publishers[book.publisher];
  }

  // Use only the first category for faceting
  if (book.categories?.length > 0) {
    const category = book.categories[0];
    newFacets.categories[category] = (newFacets.categories[category] || 0) + delta;
    if (newFacets.categories[category] <= 0) delete newFacets.categories[category];
  }

  return newFacets;
}

/**
 * Main reducer function for all application state transitions.
 *
 * Actions are grouped into three categories:
 * - General: SET_LOADING, SET_ERROR, SET_FACETS, SET_BOOKS, SET_SELECTED,
 *   UPDATE_SELECTED, SET_PAGE
 * - Cart: ADD_TO_CART, REMOVE_FROM_CART, BULK_REMOVE_FROM_CART, CLEAR_CART,
 *   SET_CART_SELECTED, UPDATE_CART_SELECTED, SET_CART_SELECTED_ITEMS,
 *   TOGGLE_CART_ITEM, SELECT_ALL_CART_ITEMS, CLEAR_CART_SELECTION, SET_CART_PAGE
 *
 * @param {Object} state - Current state.
 * @param {Object} action - Action with type and payload.
 * @returns {Object} New state.
 */
function reducer(state, action) {
  switch (action.type) {
    case "SET_LOADING":
      return { ...state, loading: action.payload };

    case "SET_ERROR":
      return { ...state, error: action.payload, loading: false };

    case "SET_FACETS":
      return {
        ...state,
        facets: action.payload,
        filters: buildFiltersFromFacets(action.payload),
      };

    case "SET_BOOKS":
      return {
        ...state,
        books: action.payload.books,
        total: action.payload.total,
        loading: false,
      };

    case "SET_SELECTED":
      // Full replacement of selected filters — resets page to 1
      return {
        ...state,
        selected: action.payload,
        page: 1,
      };

    case "UPDATE_SELECTED": {
      // Partial update via updater function (used for individual filter changes)
      const updater = action.payload;
      const newSelected = updater(state.selected);
      return {
        ...state,
        selected: newSelected,
        page: 1,
      };
    }

    case "SET_PAGE":
      return { ...state, page: action.payload };

    // ── Cart Actions ──

    case "ADD_TO_CART": {
      /**
       * Content-based deduplication hash.
       * Uses title + authors + publisher + opdsId + language to uniquely
       * identify a book entry. This is more reliable than position-based IDs,
       * which are not unique across different language feeds.
       */
      const createBookHash = (book, language) => {
        const parts = [
          (book.title || '').trim().toLowerCase(),
          (book.authors || []).join(',').toLowerCase(),
          (book.publisher || '').trim().toLowerCase(),
          (book.opdsId || '').trim(),
          (language || '').trim().toLowerCase(),
        ];
        return parts.join('|');
      };

      const newBookHash = createBookHash(action.payload.book, action.payload.language);
      const normalizedFormat = action.payload.format?.toLowerCase();

      // Check for existing item with same content hash and format
      const exists = state.cart.find(
        (item) => {
          const existingHash = createBookHash(item.book, item.language);
          const existingFormat = item.format?.toLowerCase();
          return existingHash === newBookHash && existingFormat === normalizedFormat;
        }
      );
      if (exists) return state; // Skip duplicate

      const normalizedPayload = { ...action.payload, format: normalizedFormat };
      const newCartFacets = updateCartFacets(state.cartFacets, normalizedPayload, 1);

      return {
        ...state,
        cart: [...state.cart, normalizedPayload],
        cartFacets: newCartFacets,
      };
    }

    case "REMOVE_FROM_CART": {
      const item = state.cart[action.payload];
      if (!item) return state;

      const newCartFacets = updateCartFacets(state.cartFacets, item, -1);

      return {
        ...state,
        cart: state.cart.filter((_, i) => i !== action.payload),
        cartFacets: newCartFacets,
        // Re-index selection array: remove the deleted index and shift higher indices down
        cartSelectedItems: state.cartSelectedItems.filter(i => i !== action.payload)
          .map(i => i > action.payload ? i - 1 : i),
      };
    }

    case "BULK_REMOVE_FROM_CART": {
      const indicesToRemove = new Set(action.payload);
      let newCartFacets = { ...state.cartFacets };

      // Decrement facets for each removed item
      state.cart.forEach((item, i) => {
        if (indicesToRemove.has(i)) {
          newCartFacets = updateCartFacets(newCartFacets, item, -1);
        }
      });

      return {
        ...state,
        cart: state.cart.filter((_, i) => !indicesToRemove.has(i)),
        cartFacets: newCartFacets,
        cartSelectedItems: [], // Clear selection after bulk remove
      };
    }

    case "CLEAR_CART":
      return {
        ...state,
        cart: [],
        cartFacets: {
          languages: {},
          authors: {},
          publishers: {},
          categories: {},
        },
        cartSelectedItems: [],
      };

    case "SET_CART_SELECTED":
      return {
        ...state,
        cartSelected: action.payload,
        cartPage: 1, // Reset to first page when filters change
      };

    case "UPDATE_CART_SELECTED": {
      const updater = action.payload;
      return {
        ...state,
        cartSelected: updater(state.cartSelected),
        cartPage: 1,
      };
    }

    case "SET_CART_SELECTED_ITEMS":
      return {
        ...state,
        cartSelectedItems: action.payload,
      };

    case "TOGGLE_CART_ITEM": {
      const index = action.payload;
      const isSelected = state.cartSelectedItems.includes(index);
      return {
        ...state,
        cartSelectedItems: isSelected
          ? state.cartSelectedItems.filter(i => i !== index)
          : [...state.cartSelectedItems, index],
      };
    }

    case "SELECT_ALL_CART_ITEMS":
      return {
        ...state,
        cartSelectedItems: action.payload, // Array of visible/filtered indices
      };

    case "CLEAR_CART_SELECTION":
      return {
        ...state,
        cartSelectedItems: [],
      };

    case "SET_CART_PAGE":
      return {
        ...state,
        cartPage: action.payload,
      };

    default:
      return state;
  }
}

/**
 * AppProvider — Root context provider component.
 *
 * Wraps the application tree and provides global state + dispatch actions
 * to all descendants via the AppContext.
 *
 * Handles:
 * - Synchronous state hydration from sessionStorage on mount
 * - Automatic state persistence to sessionStorage on changes
 * - Data fetching triggered by filter/page changes
 * - Cart management API (add, remove, bulk remove, clear, select, etc.)
 *
 * @param {Object} props
 * @param {React.ReactNode} props.children - Child components to wrap.
 */
export function AppProvider({ children }) {
  /**
   * Initialise state with synchronous hydration from sessionStorage.
   * This prevents the language overlay from flashing on page refresh
   * when the user has already selected a language.
   */
  const [state, dispatch] = useReducer(reducer, initialState, (initial) => {
    try {
      const raw = sessionStorage.getItem("appState");
      if (!raw) return { ...initial, hydrated: true };

      const parsed = JSON.parse(raw);
      return {
        ...initial,
        ...parsed,
        hydrated: true,
        // Rebuild filters from hydrated facets to ensure consistency
        filters: buildFiltersFromFacets(parsed.facets || initial.facets),
      };
    } catch (e) {
      console.error("Hydration failed:", e);
      return { ...initial, hydrated: true };
    }
  });

  // Persist key state slices to sessionStorage whenever they change
  useEffect(() => {
    sessionStorage.setItem(
      "appState",
      JSON.stringify({
        facets: state.facets,
        selected: state.selected,
        page: state.page,
        cart: state.cart,
        cartFacets: state.cartFacets,
      })
    );
  }, [state.facets, state.selected, state.page, state.cart, state.cartFacets]);

  // Trigger a data fetch whenever filter selections or page number change
  useEffect(() => {
    fetchFromSelected(state, dispatch);
  }, [state.selected, state.page]);

  // ── Cart Helper Methods ──

  /**
   * Add a book to the cart by its ID and desired format.
   * Finds the book in the current page, attaches the active language
   * filter value, and dispatches ADD_TO_CART.
   *
   * @param {string|number} bookId - Book ID or OPDS ID.
   * @param {string} format - Download format (e.g., "pdf", "epub").
   */
  const addToCart = (bookId, format) => {
    const book = state.books.find(
      (b) => String(b.id) === String(bookId) || String(b.opdsId) === String(bookId)
    );
    if (!book) return;

    // Store the currently selected language with the cart item.
    // This is more reliable than book.language from OPDS metadata.
    const language = state.selected.language || null;

    dispatch({
      type: "ADD_TO_CART",
      payload: { book, format, language },
    });
  };

  /** Remove a single cart item by index. */
  const removeFromCart = (index) =>
    dispatch({ type: "REMOVE_FROM_CART", payload: index });

  /** Remove all items from the cart. */
  const clearCart = () =>
    dispatch({ type: "CLEAR_CART" });

  /** Remove multiple cart items by their indices. */
  const bulkRemoveFromCart = (indices) =>
    dispatch({ type: "BULK_REMOVE_FROM_CART", payload: indices });

  /** Update cart filter selections (accepts an object or updater function). */
  const setCartSelected = (nextOrUpdater) => {
    if (typeof nextOrUpdater === "function") {
      dispatch({ type: "UPDATE_CART_SELECTED", payload: nextOrUpdater });
    } else {
      dispatch({ type: "SET_CART_SELECTED", payload: nextOrUpdater });
    }
  };

  /** Toggle selection state for a single cart item. */
  const toggleCartItem = (index) =>
    dispatch({ type: "TOGGLE_CART_ITEM", payload: index });

  /** Select all cart items at the given indices (typically the current page). */
  const selectAllCartItems = (indices) =>
    dispatch({ type: "SELECT_ALL_CART_ITEMS", payload: indices });

  /** Clear all cart item selections. */
  const clearCartSelection = () =>
    dispatch({ type: "CLEAR_CART_SELECTION" });

  /** Set the current cart page number. */
  const setCartPage = (page) =>
    dispatch({ type: "SET_CART_PAGE", payload: page });

  // Build the context value object with state and all action dispatchers
  const value = {
    ...state,
    setSelected: (nextOrUpdater) => {
      if (typeof nextOrUpdater === "function") {
        dispatch({ type: "UPDATE_SELECTED", payload: nextOrUpdater });
      } else {
        dispatch({ type: "SET_SELECTED", payload: nextOrUpdater });
      }
    },
    setPage: (p) =>
      dispatch({ type: "SET_PAGE", payload: p }),

    // Cart API
    addToCart,
    removeFromCart,
    clearCart,
    bulkRemoveFromCart,
    setCartSelected,
    toggleCartItem,
    selectAllCartItems,
    clearCartSelection,
    setCartPage,
  };

  return (
    <AppContext.Provider value={value}>
      {children}
    </AppContext.Provider>
  );
}

/**
 * Fetch books from the backend based on the current filter state.
 *
 * Constructs API parameters from the selected filters and dispatches
 * the results to update facets and books in state.
 *
 * Implements a critical rule: when a language is selected, the language
 * facet list is preserved from the initial catalog fetch to prevent it
 * from being overwritten by the language-scoped response.
 *
 * @param {Object} state - Current application state.
 * @param {Function} dispatch - Reducer dispatch function.
 */
async function fetchFromSelected(state, dispatch) {
  dispatch({ type: "SET_LOADING", payload: true });

  try {
    const { selected, page, perPage } = state;

    // Build request parameters from active selections
    const params = { page, perPage };

    if (selected.language) params.language = selected.language;
    if (selected.authors.length) params.authors = selected.authors.join(",");
    if (selected.publishers.length) params.publishers = selected.publishers.join(",");
    if (selected.categories.length) params.categories = selected.categories.join(",");
    if (selected.readingLevels.length) params.readingLevels = selected.readingLevels.join(",");
    if (selected.q?.trim()) params.q = selected.q.trim();

    const json = await backendApi.fetchBooks(params);

    /**
     * CRITICAL: Facet locking rule.
     *
     * When no language is selected, the API returns the full language facet
     * list. Once a language is selected, subsequent API responses only
     * contain facets for that language's books (authors, publishers, etc.).
     *
     * To prevent the language list from disappearing when a language is
     * active, we preserve the existing languages facet and only update
     * the other facet dimensions.
     */
    if (!selected.language) {
      // Catalog-level fetch → update all facets including languages
      dispatch({
        type: "SET_FACETS",
        payload: json.facets || {},
      });
    } else {
      // Language-scoped fetch → preserve the canonical language list
      dispatch({
        type: "SET_FACETS",
        payload: {
          languages: state.facets.languages, // Keep original language facets
          authors: json.facets?.authors || {},
          publishers: json.facets?.publishers || {},
          categories: json.facets?.categories || {},
          readingLevels: json.facets?.readingLevels || {},
        },
      });
    }

    dispatch({
      type: "SET_BOOKS",
      payload: {
        books: json.books || [],
        total: json.total || 0,
      },
    });
  } catch (err) {
    dispatch({
      type: "SET_ERROR",
      payload: err.message || "Failed to fetch books",
    });
  }
}

/**
 * Custom hook to access the application context.
 * Must be used within a component wrapped by <AppProvider>.
 *
 * @returns {Object} The full context value (state + action dispatchers).
 */
export function useAppContext() {
  return useContext(AppContext);
}
