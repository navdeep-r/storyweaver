import {
  createContext,
  useContext,
  useReducer,
  useEffect,
  useRef,
  useCallback,
} from "react";
import backendApi from "../services/backendApi";

const initialState = {
  books: [],
  page: 1,
  perPage: 50,
  total: 0,
  filters: {
    languages: [],
    authors: [],
    publishers: [],
    categories: [],
  },
  facets: {
    languages: {},
    publishers: {},
    categories: {},
    authors: {},
    readingLevels: {},
  },
  selectedFilters: {},
  cart: [],
  loading: false,
  error: null,
  theme: "light",
  animateBooks: false,
  animateFilters: false,
};

const ACTIONS = {
  SET_LOADING: "SET_LOADING",
  SET_ERROR: "SET_ERROR",
  SET_BOOKS: "SET_BOOKS",
  SET_FILTERS: "SET_FILTERS",
  SET_FACETS: "SET_FACETS",
  SET_SELECTED_FILTERS: "SET_SELECTED_FILTERS",
  SET_PAGINATION: "SET_PAGINATION",
  ADD_TO_CART: "ADD_TO_CART",
  REMOVE_FROM_CART: "REMOVE_FROM_CART",
  CLEAR_CART: "CLEAR_CART",
  SET_THEME: "SET_THEME",
  TRIGGER_ANIMATION: "TRIGGER_ANIMATION",
};

const appReducer = (state, action) => {
  switch (action.type) {
    case ACTIONS.SET_LOADING:
      return { ...state, loading: action.payload };

    case ACTIONS.SET_ERROR:
      return { ...state, error: action.payload, loading: false };

    case ACTIONS.SET_BOOKS:
      return { ...state, books: action.payload, loading: false, error: null };

    case ACTIONS.SET_SELECTED_FILTERS:
      if (typeof action.payload === "function") {
        return {
          ...state,
          selectedFilters: action.payload(state.selectedFilters),
        };
      }
      return {
        ...state,
        selectedFilters: { ...state.selectedFilters, ...action.payload },
      };

    case ACTIONS.SET_FACETS: {
      const incomingLangFacets = action.payload.languages || {};
      const existingLangs = state.facets.languages;

      const updatedLanguages = {};
      for (const lang of Object.keys(existingLangs)) {
        updatedLanguages[lang] = incomingLangFacets[lang] || 0;
      }

      return {
        ...state,
        facets: {
          languages: updatedLanguages,
          authors: action.payload.authors || {},
          publishers: action.payload.publishers || {},
          categories: action.payload.categories || {},
          readingLevels: action.payload.readingLevels || {},
        },
      };
    }

    case ACTIONS.SET_FILTERS:
      return {
        ...state,
        filters: {
          languages: action.payload.languages,
          authors: action.payload.authors,
          publishers: action.payload.publishers,
          categories: action.payload.categories,
        },
      };

    case ACTIONS.SET_PAGINATION:
      return {
        ...state,
        page: action.payload.page ?? state.page,
        perPage: action.payload.perPage ?? state.perPage,
        total: action.payload.total ?? state.total,
      };

    case ACTIONS.ADD_TO_CART:
      if (
        state.cart.find(
          (item) =>
            item.book.id === action.payload.book.id &&
            item.format === action.payload.format
        )
      )
        return state;
      return { ...state, cart: [...state.cart, action.payload] };

    case ACTIONS.REMOVE_FROM_CART:
      return {
        ...state,
        cart: state.cart.filter((_, i) => i !== action.payload),
      };

    case ACTIONS.CLEAR_CART:
      return { ...state, cart: [] };

    case ACTIONS.SET_THEME:
      return { ...state, theme: action.payload };

    case ACTIONS.TRIGGER_ANIMATION:
      return { ...state, ...action.payload };

    default:
      return state;
  }
};

const AppContext = createContext();

export const AppProvider = ({ children }) => {
  const [state, dispatch] = useReducer(appReducer, initialState);
  const isInitialized = useRef(false);
  const controller = useRef(null);
  const prevFilters = useRef();

  useEffect(() => {
    const savedTheme = localStorage.getItem("theme") || "light";
    setTheme(savedTheme);

    const persisted = localStorage.getItem("appState");
    if (persisted) {
      try {
        const parsed = JSON.parse(persisted);
        dispatch({
          type: ACTIONS.SET_SELECTED_FILTERS,
          payload: parsed.selectedFilters || {},
        });
        dispatch({
          type: ACTIONS.SET_PAGINATION,
          payload: parsed.pagination || {},
        });
      } catch {}
    }
  }, []);

  useEffect(() => {
    localStorage.setItem(
      "appState",
      JSON.stringify({
        selectedFilters: state.selectedFilters,
        pagination: { page: state.page, perPage: state.perPage },
        theme: state.theme,
      })
    );
  }, [state.selectedFilters, state.page, state.perPage, state.theme]);

  const setTheme = useCallback((theme) => {
    document.documentElement.className = "";
    document.documentElement.classList.add(theme);
    localStorage.setItem("theme", theme);
    dispatch({ type: ACTIONS.SET_THEME, payload: theme });
  }, []);

  const fetchPage = useCallback(
    async (page = 1, perPage = 50, filters = null) => {
      dispatch({ type: ACTIONS.SET_LOADING, payload: true });

      if (controller.current) controller.current.abort();
      controller.current = new AbortController();

      try {
        const params = { page, perPage };

        if (filters?.language) params.language = filters.language;
        if (filters?.authors) params.authors = filters.authors.join(",");
        if (filters?.publishers) params.publishers = filters.publishers.join(",");
        if (filters?.categories) params.categories = filters.categories.join(",");
        if (filters?.search) params.q = filters.search.trim();

        const json = await backendApi.fetchBooks(params, {
          signal: controller.current.signal,
        });

        dispatch({ type: ACTIONS.SET_BOOKS, payload: json.books || [] });
        dispatch({ type: ACTIONS.SET_FACETS, payload: json.facets || {} });

        dispatch({
          type: ACTIONS.SET_FILTERS,
          payload: {
            languages: Object.keys(state.facets.languages).length
              ? Object.keys(state.facets.languages)
              : Object.keys(json.facets.languages || {}),
            authors: Object.keys(json.facets.authors || {}),
            publishers: Object.keys(json.facets.publishers || {}),
            categories: Object.keys(json.facets.categories || {}),
          },
        });

        dispatch({
          type: ACTIONS.SET_PAGINATION,
          payload: { page: json.page || page, total: json.total || 0 },
        });

        dispatch({
          type: ACTIONS.TRIGGER_ANIMATION,
          payload: { animateBooks: true },
        });

        setTimeout(
          () =>
            dispatch({
              type: ACTIONS.TRIGGER_ANIMATION,
              payload: { animateBooks: false },
            }),
          600
        );
      } catch (error) {
        if (error.name !== "AbortError") {
          dispatch({ type: ACTIONS.SET_ERROR, payload: error.message });
        }
      } finally {
        dispatch({ type: ACTIONS.SET_LOADING, payload: false });
      }
    },
    [state.facets.languages]
  );

  useEffect(() => {
    if (!isInitialized.current) {
      fetchPage(1, 50, {});
      isInitialized.current = true;
      return;
    }

    if (
      JSON.stringify(prevFilters.current) ===
      JSON.stringify(state.selectedFilters)
    )
      return;

    prevFilters.current = state.selectedFilters;
    fetchPage(1, state.perPage, state.selectedFilters);

    dispatch({
      type: ACTIONS.TRIGGER_ANIMATION,
      payload: { animateFilters: true },
    });

    setTimeout(
      () =>
        dispatch({
          type: ACTIONS.TRIGGER_ANIMATION,
          payload: { animateFilters: false },
        }),
      700
    );
  }, [state.selectedFilters, state.perPage, fetchPage]);

  const addToCart = (bookId, format) => {
    const book = state.books.find(
      (b) => String(b.id) === String(bookId) || String(b.opdsId) === String(bookId)
    );
    if (book)
      dispatch({
        type: ACTIONS.ADD_TO_CART,
        payload: { book, format },
      });
  };

  const removeFromCart = (index) =>
    dispatch({ type: ACTIONS.REMOVE_FROM_CART, payload: index });

  const clearCart = () => dispatch({ type: ACTIONS.CLEAR_CART });

  const value = {
    ...state,
    setTheme,
    addToCart,
    removeFromCart,
    clearCart,
    setSelectedFilters: (filters) =>
      dispatch({
        type: ACTIONS.SET_SELECTED_FILTERS,
        payload: filters,
      }),
    setPage: (page) => fetchPage(page, state.perPage, state.selectedFilters),
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};

export const useAppContext = () => {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useAppContext must be used within an AppProvider");
  return ctx;
};
