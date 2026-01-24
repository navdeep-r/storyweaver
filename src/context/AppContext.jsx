import {
  createContext,
  useContext,
  useEffect,
  useReducer,
} from "react";
import backendApi from "../services/backendApi";

const AppContext = createContext();

const initialState = {
  // 🔹 FILTER ARCHITECTURE (unchanged)
  facets: {
    languages: {},
    authors: {},
    publishers: {},
    categories: {},
    readingLevels: {},
  },
  filters: {
    languages: [],
    authors: [],
    publishers: [],
    categories: [],
    readingLevels: [],
  },
  selected: {
    language: null,
    authors: [],
    publishers: [],
    categories: [],
    readingLevels: [],
    q: "",
  },

  // 🔹 BOOK DATA
  books: [],
  total: 0,
  page: 1,
  perPage: 50,

  // 🛒 CART STATE
  cart: [],
  cartFacets: {
    languages: {},
    authors: {},
    publishers: {},
    categories: {},
  },
  cartSelected: {
    languages: [],
    authors: [],
    publishers: [],
    categories: [],
    searchTerm: "",
  },
  cartSelectedItems: [], // indices of selected items for bulk operations
  cartPage: 1,
  cartPerPage: 100,

  // 🔹 UI STATE
  hydrated: false, // Set to true after localStorage hydration completes
  loading: false,
  error: null,
};

function buildFiltersFromFacets(facets) {
  return {
    languages: Object.keys(facets.languages || {}),
    authors: Object.keys(facets.authors || {}),
    publishers: Object.keys(facets.publishers || {}),
    categories: Object.keys(facets.categories || {}),
    readingLevels: Object.keys(facets.readingLevels || {}),
  };
}

// Helper to update cart facets when adding/removing books
// cartItem has { book, format, language } - language is the selected language at time of add
function updateCartFacets(currentFacets, cartItem, delta) {
  const { book, language } = cartItem;
  const newFacets = {
    languages: { ...currentFacets.languages },
    authors: { ...currentFacets.authors },
    publishers: { ...currentFacets.publishers },
    categories: { ...currentFacets.categories },
  };

  // Update language (use stored language from when item was added, not book.language)
  if (language) {
    newFacets.languages[language] = (newFacets.languages[language] || 0) + delta;
    if (newFacets.languages[language] <= 0) delete newFacets.languages[language];
  }

  // Update authors (first author)
  if (book.authors?.length > 0) {
    const author = book.authors[0];
    newFacets.authors[author] = (newFacets.authors[author] || 0) + delta;
    if (newFacets.authors[author] <= 0) delete newFacets.authors[author];
  }

  // Update publisher
  if (book.publisher) {
    newFacets.publishers[book.publisher] = (newFacets.publishers[book.publisher] || 0) + delta;
    if (newFacets.publishers[book.publisher] <= 0) delete newFacets.publishers[book.publisher];
  }

  // Update categories (first category)
  if (book.categories?.length > 0) {
    const category = book.categories[0];
    newFacets.categories[category] = (newFacets.categories[category] || 0) + delta;
    if (newFacets.categories[category] <= 0) delete newFacets.categories[category];
  }

  return newFacets;
}

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
      return {
        ...state,
        selected: action.payload,
        page: 1,
      };

    // Partial update for author/publisher/category changes
    case "UPDATE_SELECTED": {
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

    // 🛒 CART REDUCER
    case "ADD_TO_CART": {
      // Create a content-based hash for unique identification
      // This is safer than position-based IDs which aren't unique across languages
      // Includes language since the same book may be translated
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
      // Normalize format to lowercase for consistent comparison
      const normalizedFormat = action.payload.format?.toLowerCase();

      // Check for duplicates using content hash (includes language) + format
      const exists = state.cart.find(
        (item) => {
          const existingHash = createBookHash(item.book, item.language);
          const existingFormat = item.format?.toLowerCase();
          return existingHash === newBookHash && existingFormat === normalizedFormat;
        }
      );
      if (exists) return state;

      // Store with normalized format
      const normalizedPayload = { ...action.payload, format: normalizedFormat };

      // Update cart facets (pass full item which includes language)
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

      // Update cart facets (decrement) - pass full item which includes language
      const newCartFacets = updateCartFacets(state.cartFacets, item, -1);

      return {
        ...state,
        cart: state.cart.filter((_, i) => i !== action.payload),
        cartFacets: newCartFacets,
        cartSelectedItems: state.cartSelectedItems.filter(i => i !== action.payload)
          .map(i => i > action.payload ? i - 1 : i), // Adjust indices
      };
    }

    case "BULK_REMOVE_FROM_CART": {
      const indicesToRemove = new Set(action.payload);
      let newCartFacets = { ...state.cartFacets };

      // Decrement facets for each removed item (pass full item with language)
      state.cart.forEach((item, i) => {
        if (indicesToRemove.has(i)) {
          newCartFacets = updateCartFacets(newCartFacets, item, -1);
        }
      });

      return {
        ...state,
        cart: state.cart.filter((_, i) => !indicesToRemove.has(i)),
        cartFacets: newCartFacets,
        cartSelectedItems: [],
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
        cartPage: 1,
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

export function AppProvider({ children }) {
  // Synchronous hydration from localStorage
  const [state, dispatch] = useReducer(reducer, initialState, (initial) => {
    try {
      const raw = sessionStorage.getItem("appState");
      if (!raw) return { ...initial, hydrated: true };

      const parsed = JSON.parse(raw);
      return {
        ...initial,
        ...parsed,
        hydrated: true,
        // Always rebuild filters from hydrated facets
        filters: buildFiltersFromFacets(parsed.facets || initial.facets),
      };
    } catch (e) {
      console.error("Hydration failed:", e);
      return { ...initial, hydrated: true };
    }
  });

  // 🔹 persist (includes cart and cartFacets)
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

  // 🔹 single fetch driver
  useEffect(() => {
    fetchFromSelected(state, dispatch);
  }, [state.selected, state.page]);

  // 🛒 Cart helpers (API-compatible with old code)
  const addToCart = (bookId, format) => {
    const book = state.books.find(
      (b) => String(b.id) === String(bookId) || String(b.opdsId) === String(bookId)
    );
    if (!book) return;

    // Store the currently selected language (global filter) with the cart item
    // This is the reliable language since book.language from OPDS is unreliable
    const language = state.selected.language || null;

    dispatch({
      type: "ADD_TO_CART",
      payload: { book, format, language },
    });
  };

  const removeFromCart = (index) =>
    dispatch({ type: "REMOVE_FROM_CART", payload: index });

  const clearCart = () =>
    dispatch({ type: "CLEAR_CART" });

  const bulkRemoveFromCart = (indices) =>
    dispatch({ type: "BULK_REMOVE_FROM_CART", payload: indices });

  const setCartSelected = (nextOrUpdater) => {
    if (typeof nextOrUpdater === "function") {
      dispatch({ type: "UPDATE_CART_SELECTED", payload: nextOrUpdater });
    } else {
      dispatch({ type: "SET_CART_SELECTED", payload: nextOrUpdater });
    }
  };

  const toggleCartItem = (index) =>
    dispatch({ type: "TOGGLE_CART_ITEM", payload: index });

  const selectAllCartItems = (indices) =>
    dispatch({ type: "SELECT_ALL_CART_ITEMS", payload: indices });

  const clearCartSelection = () =>
    dispatch({ type: "CLEAR_CART_SELECTION" });

  const setCartPage = (page) =>
    dispatch({ type: "SET_CART_PAGE", payload: page });

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

    // 🛒 exposed cart API
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

async function fetchFromSelected(state, dispatch) {
  dispatch({ type: "SET_LOADING", payload: true });

  try {
    const { selected, page, perPage } = state;

    const params = { page, perPage };

    if (selected.language) params.language = selected.language;
    if (selected.authors.length) params.authors = selected.authors.join(",");
    if (selected.publishers.length) params.publishers = selected.publishers.join(",");
    if (selected.categories.length) params.categories = selected.categories.join(",");
    if (selected.readingLevels.length) params.readingLevels = selected.readingLevels.join(",");
    if (selected.q?.trim()) params.q = selected.q.trim();

    const json = await backendApi.fetchBooks(params);

    // 🔒 CRITICAL RULE ENFORCEMENT
    if (!selected.language) {
      // catalog fetch → language facets allowed
      dispatch({
        type: "SET_FACETS",
        payload: json.facets || {},
      });
    } else {
      // language-scoped fetch → language facets LOCKED
      dispatch({
        type: "SET_FACETS",
        payload: {
          languages: state.facets.languages, // preserve canonical list
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

export function useAppContext() {
  return useContext(AppContext);
}
