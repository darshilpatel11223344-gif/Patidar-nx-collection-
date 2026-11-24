import { useEffect, useState, type FormEvent } from 'react';
import { ChevronLeft, ChevronRight, Search, SlidersHorizontal, X } from 'lucide-react';
import { navigateTo } from '../lib/navigation.ts';
import { updatePageSeo } from '../lib/seo.ts';
import { ProductCard } from '../components/ProductCard.tsx';
import type { Category, HomepageSettings, PaginatedProductsResponse } from '../types/catalog.ts';

interface CatalogPageProps {
  mode: 'all' | 'sarees' | 'new-arrivals';
  searchQueryString: string;
  categories: Category[];
  settings: HomepageSettings;
}

export function CatalogPage({
  mode,
  searchQueryString,
  categories,
  settings,
}: CatalogPageProps) {
  const urlParams = new URLSearchParams(searchQueryString);

  const initialCategory =
    mode === 'sarees'
      ? 'sarees'
      : mode === 'new-arrivals'
        ? 'new-arrivals'
        : urlParams.get('category') || 'all';

  const [queryInput, setQueryInput] = useState(urlParams.get('q') || '');
  const [selectedCategory, setSelectedCategory] = useState(initialCategory);
  const [selectedColour, setSelectedColour] = useState(urlParams.get('colour') || 'all');
  const [availability, setAvailability] = useState(
    urlParams.get('availability') || 'all'
  );
  const [minPrice, setMinPrice] = useState(urlParams.get('minPrice') || '');
  const [maxPrice, setMaxPrice] = useState(urlParams.get('maxPrice') || '');
  const [onlyFeatured, setOnlyFeatured] = useState(
    urlParams.get('featured') === 'true'
  );
  const [onlyNewArrival, setOnlyNewArrival] = useState(
    mode === 'new-arrivals' || urlParams.get('newArrival') === 'true'
  );
  const [sort, setSort] = useState(urlParams.get('sort') || 'newest');
  const [page, setPage] = useState(Math.max(1, Number(urlParams.get('page')) || 1));

  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
  const [data, setData] = useState<PaginatedProductsResponse>({
    items: [],
    total: 0,
    page: 1,
    limit: 12,
    totalPages: 1,
    facets: { colours: [] },
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Sync mode/URL switches
  useEffect(() => {
    const p = new URLSearchParams(searchQueryString);
    setQueryInput(p.get('q') || '');
    setSelectedCategory(
      mode === 'sarees'
        ? 'sarees'
        : mode === 'new-arrivals'
          ? 'new-arrivals'
          : p.get('category') || 'all'
    );
    setSelectedColour(p.get('colour') || 'all');
    setAvailability(p.get('availability') || 'all');
    setMinPrice(p.get('minPrice') || '');
    setMaxPrice(p.get('maxPrice') || '');
    setOnlyFeatured(p.get('featured') === 'true');
    setOnlyNewArrival(mode === 'new-arrivals' || p.get('newArrival') === 'true');
    setSort(p.get('sort') || 'newest');
    setPage(Math.max(1, Number(p.get('page')) || 1));
  }, [mode, searchQueryString]);

  useEffect(() => {
    const title =
      mode === 'sarees'
        ? 'Saree Collection — PATIDAR NX COLLECTION'
        : mode === 'new-arrivals'
          ? 'New Arrivals — PATIDAR NX COLLECTION'
          : 'All Collections — PATIDAR NX COLLECTION';

    updatePageSeo({
      title,
      description:
        'Browse luxury sarees, bridal wear, designer drapes, and wedding ensembles by category, colour, fabric, or Product ID at PATIDAR NX COLLECTION.',
    });
  }, [mode]);

  useEffect(() => {
    let active = true;
    const fetchCatalog = async () => {
      setLoading(true);
      setError(null);
      try {
        const params = new URLSearchParams();
        params.set('page', String(page));
        params.set('limit', '12');
        if (queryInput.trim()) params.set('q', queryInput.trim());
        if (selectedCategory !== 'all') params.set('category', selectedCategory);
        if (selectedColour !== 'all') params.set('colour', selectedColour);
        if (availability !== 'all') params.set('availability', availability);
        if (minPrice.trim()) params.set('minPrice', minPrice.trim());
        if (maxPrice.trim()) params.set('maxPrice', maxPrice.trim());
        if (onlyFeatured) params.set('featured', 'true');
        if (onlyNewArrival) params.set('newArrival', 'true');
        params.set('sort', sort);

        const res = await fetch(`/api/products?${params.toString()}`);
        if (!res.ok) throw new Error('Failed to load collection');
        const payload: PaginatedProductsResponse = await res.json();
        if (active) setData(payload);
      } catch (err) {
        console.error(err);
        if (active) setError('Unable to load collection right now. Please try again.');
      } finally {
        if (active) setLoading(false);
      }
    };

    fetchCatalog();
    return () => {
      active = false;
    };
  }, [
    page,
    queryInput,
    selectedCategory,
    selectedColour,
    availability,
    minPrice,
    maxPrice,
    onlyFeatured,
    onlyNewArrival,
    sort,
  ]);

  const handleResetFilters = () => {
    setQueryInput('');
    setSelectedCategory(
      mode === 'sarees' ? 'sarees' : mode === 'new-arrivals' ? 'new-arrivals' : 'all'
    );
    setSelectedColour('all');
    setAvailability('all');
    setMinPrice('');
    setMaxPrice('');
    setOnlyFeatured(false);
    setOnlyNewArrival(mode === 'new-arrivals');
    setSort('newest');
    setPage(1);
    if (mode === 'all') {
      navigateTo('/collections');
    }
  };

  const handleSearchSubmit = (e: FormEvent) => {
    e.preventDefault();
    setPage(1);
  };

  const pageHeading =
    mode === 'sarees'
      ? 'The Saree Collection'
      : mode === 'new-arrivals'
        ? 'New Arrivals'
        : selectedCategory !== 'all'
          ? categories.find((c) => c.slug === selectedCategory)?.name || 'All Collections'
          : 'All Collections';

  return (
    <div className="bg-[#0E0E10] min-h-screen py-12 lg:py-16">
      <div className="max-w-[1360px] mx-auto px-4 sm:px-6 lg:px-10">
        {/* Header */}
        <div className="pb-8 border-b border-[#262522] mb-8 space-y-4">
          <p className="text-xs font-medium tracking-[0.2em] uppercase text-[#C8A46B]">
            PATIDAR NX COLLECTION
          </p>
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
            <h1 className="font-display text-4xl sm:text-5xl font-medium text-[#FAF7F0]">
              {pageHeading}
            </h1>
            <p className="text-sm text-[#BEB3A2] tabular-nums">
              {data.total} {data.total === 1 ? 'creation' : 'creations'} found
            </p>
          </div>
        </div>

        {/* Search & Quick Sort Bar */}
        <div className="flex flex-col lg:flex-row gap-4 mb-8">
          <form
            onSubmit={handleSearchSubmit}
            className="flex-1 flex items-center gap-3 bg-[#151518] border border-[#2A2927] px-4 py-2.5 focus-within:border-[#C8A46B]"
          >
            <Search className="w-4 h-4 text-[#C8A46B] shrink-0" aria-hidden="true" />
            <input
              type="text"
              value={queryInput}
              onChange={(e) => {
                setQueryInput(e.target.value);
                setPage(1);
              }}
              placeholder="Search by Product Name, Unique Product ID (e.g. PNX-1001), fabric, or weave..."
              className="w-full bg-transparent text-sm text-[#FAF7F0] placeholder:text-[#8E877D] focus:outline-none"
            />
            {queryInput && (
              <button
                type="button"
                onClick={() => {
                  setQueryInput('');
                  setPage(1);
                }}
                aria-label="Clear search"
                className="text-[#8E877D] hover:text-[#FAF7F0] cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </form>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setMobileFiltersOpen((prev) => !prev)}
              className="lg:hidden inline-flex items-center gap-2 px-4 py-2.5 border border-[#2A2927] bg-[#151518] text-xs font-semibold tracking-wider uppercase text-[#FAF7F0] cursor-pointer"
            >
              <SlidersHorizontal className="w-4 h-4 text-[#C8A46B]" aria-hidden="true" />
              <span>Filters</span>
            </button>

            <label className="flex items-center gap-2 bg-[#151518] border border-[#2A2927] px-3 py-2.5 text-xs text-[#BEB3A2]">
              <span className="uppercase tracking-wider shrink-0">Sort:</span>
              <select
                value={sort}
                onChange={(e) => {
                  setSort(e.target.value);
                  setPage(1);
                }}
                className="bg-transparent text-[#FAF7F0] focus:outline-none cursor-pointer"
              >
                <option value="newest" className="bg-[#151518]">
                  Newest First
                </option>
                <option value="price_asc" className="bg-[#151518]">
                  Price: Low to High
                </option>
                <option value="price_desc" className="bg-[#151518]">
                  Price: High to Low
                </option>
                <option value="name_asc" className="bg-[#151518]">
                  Name: A to Z
                </option>
              </select>
            </label>
          </div>
        </div>

        {/* Main Content Grid: Filter Sidebar + Product Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 items-start">
          {/* Filter Sidebar */}
          <aside
            className={`lg:col-span-3 bg-[#151518] border border-[#262522] p-6 space-y-6 ${
              mobileFiltersOpen ? 'block' : 'hidden lg:block'
            }`}
          >
            <div className="flex items-center justify-between border-b border-[#262522] pb-3">
              <h2 className="font-display text-xl text-[#FAF7F0]">Refine Selection</h2>
              <button
                type="button"
                onClick={handleResetFilters}
                className="text-xs text-[#C8A46B] hover:underline cursor-pointer"
              >
                Reset All
              </button>
            </div>

            {/* Categories */}
            <div className="space-y-2.5">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#9C9488]">
                Category
              </p>
              <div className="flex flex-col space-y-1 max-h-64 overflow-y-auto pr-1">
                <button
                  type="button"
                  onClick={() => {
                    setSelectedCategory('all');
                    setPage(1);
                  }}
                  className={`text-left text-sm py-1.5 px-2 transition-colors cursor-pointer ${
                    selectedCategory === 'all'
                      ? 'text-[#0E0E10] bg-[#C8A46B] font-semibold'
                      : 'text-[#D6C9B6] hover:text-[#FAF7F0]'
                  }`}
                >
                  All Collections
                </button>
                {categories.map((cat) => (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => {
                      setSelectedCategory(cat.slug);
                      setPage(1);
                    }}
                    className={`flex items-center justify-between text-left text-sm py-1.5 px-2 transition-colors cursor-pointer ${
                      selectedCategory === cat.slug
                        ? 'text-[#0E0E10] bg-[#C8A46B] font-semibold'
                        : 'text-[#D6C9B6] hover:text-[#FAF7F0]'
                    }`}
                  >
                    <span className="truncate">{cat.name}</span>
                    <span className="text-xs font-mono tabular-nums opacity-80">
                      {cat.productCount ?? 0}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Colour Filter */}
            <div className="space-y-2.5 pt-4 border-t border-[#262522]">
              <label className="block text-xs font-semibold uppercase tracking-[0.14em] text-[#9C9488]">
                Colour Palette
              </label>
              <select
                value={selectedColour}
                onChange={(e) => {
                  setSelectedColour(e.target.value);
                  setPage(1);
                }}
                className="w-full bg-[#0E0E10] border border-[#2A2927] px-3 py-2 text-sm text-[#FAF7F0] focus:outline-none focus:border-[#C8A46B]"
              >
                <option value="all">All Colours</option>
                {data.facets.colours.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>

            {/* Price Range */}
            <div className="space-y-2.5 pt-4 border-t border-[#262522]">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#9C9488]">
                Price Range (INR)
              </p>
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="number"
                  min={0}
                  value={minPrice}
                  onChange={(e) => {
                    setMinPrice(e.target.value);
                    setPage(1);
                  }}
                  placeholder="Min ₹"
                  className="bg-[#0E0E10] border border-[#2A2927] px-2.5 py-2 text-xs font-mono text-[#FAF7F0] focus:outline-none focus:border-[#C8A46B]"
                />
                <input
                  type="number"
                  min={0}
                  value={maxPrice}
                  onChange={(e) => {
                    setMaxPrice(e.target.value);
                    setPage(1);
                  }}
                  placeholder="Max ₹"
                  className="bg-[#0E0E10] border border-[#2A2927] px-2.5 py-2 text-xs font-mono text-[#FAF7F0] focus:outline-none focus:border-[#C8A46B]"
                />
              </div>
            </div>

            {/* Availability & Highlights */}
            <div className="space-y-3 pt-4 border-t border-[#262522]">
              <label className="block text-xs font-semibold uppercase tracking-[0.14em] text-[#9C9488]">
                Availability
              </label>
              <select
                value={availability}
                onChange={(e) => {
                  setAvailability(e.target.value);
                  setPage(1);
                }}
                className="w-full bg-[#0E0E10] border border-[#2A2927] px-3 py-2 text-sm text-[#FAF7F0] focus:outline-none focus:border-[#C8A46B]"
              >
                <option value="all">Any Status</option>
                <option value="In Stock">In Stock</option>
                <option value="Made to Order">Made to Order</option>
              </select>

              <label className="flex items-center gap-2.5 text-sm text-[#D6C9B6] cursor-pointer pt-1">
                <input
                  type="checkbox"
                  checked={onlyNewArrival}
                  onChange={(e) => {
                    setOnlyNewArrival(e.target.checked);
                    setPage(1);
                  }}
                  className="accent-[#C8A46B] w-4 h-4"
                />
                <span>New Arrivals Only</span>
              </label>

              <label className="flex items-center gap-2.5 text-sm text-[#D6C9B6] cursor-pointer">
                <input
                  type="checkbox"
                  checked={onlyFeatured}
                  onChange={(e) => {
                    setOnlyFeatured(e.target.checked);
                    setPage(1);
                  }}
                  className="accent-[#C8A46B] w-4 h-4"
                />
                <span>Featured Creations Only</span>
              </label>
            </div>
          </aside>

          {/* Product Results */}
          <div className="lg:col-span-9 space-y-10">
            {error && (
              <div className="p-6 bg-[#1C1616] border border-red-800/60 text-sm text-red-200">
                {error}
              </div>
            )}

            {loading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
                {[1, 2, 3, 4, 5, 6].map((idx) => (
                  <div
                    key={idx}
                    className="bg-[#151518] border border-[#262522] animate-pulse"
                  >
                    <div className="aspect-[3/4] bg-[#1C1C20]" />
                    <div className="p-5 space-y-3">
                      <div className="h-3 w-1/2 bg-[#242429]" />
                      <div className="h-5 w-full bg-[#242429]" />
                      <div className="h-9 w-full bg-[#242429]" />
                    </div>
                  </div>
                ))}
              </div>
            ) : data.items.length === 0 ? (
              <div className="bg-[#151518] border border-[#262522] p-12 text-center space-y-4">
                <h3 className="font-display text-2xl text-[#FAF7F0]">
                  No Matching Creations Found
                </h3>
                <p className="text-sm text-[#BEB3A2] max-w-md mx-auto">
                  Try clearing one or more filters, or search by fabric name such as Banarasi,
                  Kanjivaram, Patola, or Organza.
                </p>
                <button
                  type="button"
                  onClick={handleResetFilters}
                  className="px-6 py-2.5 bg-[#C8A46B] text-[#0E0E10] text-xs font-semibold tracking-wider uppercase cursor-pointer"
                >
                  Reset Filters
                </button>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
                  {data.items.map((product) => (
                    <ProductCard
                      key={product.id}
                      product={product}
                      whatsappNumber={settings.whatsappNumber}
                    />
                  ))}
                </div>

                {/* Pagination */}
                {data.totalPages > 1 && (
                  <div className="pt-8 border-t border-[#262522] flex items-center justify-between gap-4">
                    <button
                      type="button"
                      disabled={page <= 1}
                      onClick={() => {
                        setPage((p) => Math.max(1, p - 1));
                        window.scrollTo({ top: 0, behavior: 'smooth' });
                      }}
                      className="inline-flex items-center gap-1.5 px-4 py-2 border border-[#2A2927] text-xs uppercase tracking-wider text-[#FAF7F0] disabled:opacity-40 hover:border-[#C8A46B] cursor-pointer disabled:cursor-not-allowed"
                    >
                      <ChevronLeft className="w-4 h-4" aria-hidden="true" />
                      <span>Previous</span>
                    </button>

                    <span className="text-xs font-mono tabular-nums text-[#BEB3A2]">
                      Page {data.page} of {data.totalPages}
                    </span>

                    <button
                      type="button"
                      disabled={page >= data.totalPages}
                      onClick={() => {
                        setPage((p) => Math.min(data.totalPages, p + 1));
                        window.scrollTo({ top: 0, behavior: 'smooth' });
                      }}
                      className="inline-flex items-center gap-1.5 px-4 py-2 border border-[#2A2927] text-xs uppercase tracking-wider text-[#FAF7F0] disabled:opacity-40 hover:border-[#C8A46B] cursor-pointer disabled:cursor-not-allowed"
                    >
                      <span>Next</span>
                      <ChevronRight className="w-4 h-4" aria-hidden="true" />
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
