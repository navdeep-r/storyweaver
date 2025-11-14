// Small frontend wrapper for backend API calls
// Use local backend when developing, production backend when deployed
const isDevelopment = import.meta.env.MODE === 'development';
const API_URL = isDevelopment ? 'http://localhost:5000' : 'https://storyweaver-9b0g.onrender.com';

export async function fetchBooks(params = {}) {
  const url = new URL(`${API_URL}/api/books`);
  Object.keys(params).forEach(k => {
    const v = params[k];
    if (v !== undefined && v !== null && v !== '') url.searchParams.set(k, v);
  });
  const res = await fetch(url.toString());
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Failed to fetch books: ${res.status} ${text}`);
  }
  return res.json();
}

export async function health() {
  const res = await fetch(`${API_URL}/health`);
  if (!res.ok) throw new Error('health check failed');
  return res.json();
}

const backendApi = { fetchBooks, health };

export default backendApi;