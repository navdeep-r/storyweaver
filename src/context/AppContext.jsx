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

  // 🛒 CART (new, isolated)
  cart: [],

  // 🔹 UI STATE
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

function reducer(state, action) {
  switch (action.type) {
    case "HYDRATE":
      return {
        ...state,
        facets: action.payload.facets ?? state.facets,
        selected: action.payload.selected ?? state.selected,
        page: action.payload.page ?? state.page,
        cart: action.payload.cart ?? state.cart,
        filters: buildFiltersFromFacets(
          action.payload.facets ?? state.facets
        ),
      };

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

    // 🛒 CART REDUCER (isolated)
    case "ADD_TO_CART": {
      const exists = state.cart.find(
        (item) =>
          item.book.id === action.payload.book.id &&
          item.format === action.payload.format
      );
      if (exists) return state;

      return {
        ...state,
        cart: [...state.cart, action.payload],
      };
    }

    case "REMOVE_FROM_CART":
      return {
        ...state,
        cart: state.cart.filter((_, i) => i !== action.payload),
      };

    case "CLEAR_CART":
      return {
        ...state,
        cart: [],
      };

    default:
      return state;
  }
}

export function AppProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, initialState);

  // 🔹 hydrate once
  useEffect(() => {
    const raw = localStorage.getItem("appState");
    if (!raw) return;

    const parsed = JSON.parse(raw);
    dispatch({ type: "HYDRATE", payload: parsed });
  }, []);

  // 🔹 persist (includes cart)
  useEffect(() => {
    localStorage.setItem(
      "appState",
      JSON.stringify({
        facets: state.facets,
        selected: state.selected,
        page: state.page,
        cart: state.cart,
      })
    );
  }, [state.facets, state.selected, state.page, state.cart]);

  // 🔹 single fetch driver (unchanged)
  useEffect(() => {
    fetchFromSelected(state, dispatch);
  }, [state.selected, state.page]);

  // 🛒 Cart helpers (API-compatible with old code)
  const addToCart = (bookId, format) => {
    const book = state.books.find(
      (b) => String(b.id) === String(bookId) || String(b.opdsId) === String(bookId)
    );
    if (!book) return;

    dispatch({
      type: "ADD_TO_CART",
      payload: { book, format },
    });
  };

  const removeFromCart = (index) =>
    dispatch({ type: "REMOVE_FROM_CART", payload: index });

  const clearCart = () =>
    dispatch({ type: "CLEAR_CART" });

  const value = {
    ...state,
    setSelected: (nextOrUpdater) => {
      if (typeof nextOrUpdater === "function") {
        // Callback pattern for partial updates (author/publisher/category)
        dispatch({ type: "UPDATE_SELECTED", payload: nextOrUpdater });
      } else {
        // Object pattern for full replacement (language change)
        dispatch({ type: "SET_SELECTED", payload: nextOrUpdater });
      }
    },
    setPage: (p) =>
      dispatch({ type: "SET_PAGE", payload: p }),

    // 🛒 exposed cart API
    addToCart,
    removeFromCart,
    clearCart,
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
