import { useEffect, useState } from 'react';

export function navigateTo(path: string) {
  if (typeof window === 'undefined') return;
  if (window.location.pathname + window.location.search === path) {
    window.scrollTo({ top: 0, behavior: 'smooth' });
    return;
  }
  window.history.pushState({}, '', path);
  window.dispatchEvent(new PopStateEvent('popstate'));
  window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior });
}

export function useCurrentLocation() {
  const [loc, setLoc] = useState(() => ({
    pathname: typeof window !== 'undefined' ? window.location.pathname : '/',
    search: typeof window !== 'undefined' ? window.location.search : '',
  }));

  useEffect(() => {
    const handleChange = () => {
      setLoc({
        pathname: window.location.pathname,
        search: window.location.search,
      });
    };
    window.addEventListener('popstate', handleChange);
    return () => window.removeEventListener('popstate', handleChange);
  }, []);

  return loc;
}
