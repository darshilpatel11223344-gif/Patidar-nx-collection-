import { useState, type FormEvent } from 'react';
import { Menu, Search, X } from 'lucide-react';
import { navigateTo } from '../lib/navigation.ts';

interface NavbarProps {
  currentPath: string;
}

export function Navbar({ currentPath }: NavbarProps) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const navItems = [
    { label: 'Collections', href: '/collections' },
    { label: 'Sarees', href: '/sarees' },
    { label: 'New Arrivals', href: '/new-arrivals' },
    { label: 'About', href: '/about' },
    { label: 'Contact', href: '/contact' },
  ];

  const handleLinkClick = (href: string) => {
    setMobileOpen(false);
    navigateTo(href);
  };

  const handleSearchSubmit = (e: FormEvent) => {
    e.preventDefault();
    const trimmed = searchTerm.trim();
    setSearchOpen(false);
    setMobileOpen(false);
    if (trimmed) {
      navigateTo(`/collections?q=${encodeURIComponent(trimmed)}`);
    } else {
      navigateTo('/collections');
    }
  };

  return (
    <header className="sticky top-0 z-40 bg-[#0E0E10]/95 backdrop-blur-md border-b border-[#262522]">
      <div className="max-w-[1360px] mx-auto px-4 sm:px-6 lg:px-10 h-16 lg:h-20 flex items-center justify-between gap-8">
        {/* Zone 1: Single-element Luxury Typographic Wordmark */}
        <a
          href="/"
          onClick={(e) => {
            e.preventDefault();
            handleLinkClick('/');
          }}
          className="font-display text-lg sm:text-xl lg:text-2xl font-semibold tracking-[0.16em] text-[#FAF7F0] hover:text-[#C8A46B] transition-colors whitespace-nowrap shrink-0 uppercase"
        >
          PATIDAR NX COLLECTION
        </a>

        {/* Zone 2: Clean single-line navigation links */}
        <nav
          aria-label="Primary"
          className="hidden lg:flex items-center gap-7 text-sm font-medium text-[#D6C9B6]"
        >
          {navItems.map((item) => {
            const isActive = currentPath === item.href;
            return (
              <a
                key={item.href}
                href={item.href}
                onClick={(e) => {
                  e.preventDefault();
                  handleLinkClick(item.href);
                }}
                className={`relative py-1 whitespace-nowrap shrink-0 transition-colors hover:text-[#FAF7F0] ${
                  isActive
                    ? 'text-[#C8A46B] after:absolute after:left-0 after:right-0 after:bottom-0 after:h-px after:bg-[#C8A46B]'
                    : ''
                }`}
              >
                {item.label}
              </a>
            );
          })}
        </nav>

        {/* Zone 3: Single Primary Action + Mobile Trigger */}
        <div className="flex items-center gap-3 shrink-0">
          <button
            type="button"
            onClick={() => setSearchOpen((prev) => !prev)}
            aria-label="Search collections"
            className="hidden sm:inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold tracking-[0.14em] uppercase border border-[#C8A46B]/60 text-[#FAF7F0] hover:bg-[#C8A46B] hover:text-[#0E0E10] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Search className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Search</span>
          </button>

          <button
            type="button"
            onClick={() => setMobileOpen((prev) => !prev)}
            aria-label={mobileOpen ? 'Close navigation menu' : 'Open navigation menu'}
            className="lg:hidden inline-flex items-center justify-center w-11 h-11 text-[#FAF7F0] hover:text-[#C8A46B] transition-colors cursor-pointer"
          >
            {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Expandable Search Bar */}
      {searchOpen && (
        <div className="border-t border-[#262522] bg-[#151518]">
          <form
            onSubmit={handleSearchSubmit}
            className="max-w-[1360px] mx-auto px-4 sm:px-6 lg:px-10 py-3 flex items-center gap-3"
          >
            <Search className="w-4 h-4 text-[#C8A46B] shrink-0" aria-hidden="true" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by saree name, weave (Banarasi, Kanjivaram, Patola), or Product ID (e.g. PNX-1001)..."
              autoFocus
              className="w-full bg-transparent text-sm text-[#FAF7F0] placeholder:text-[#8E877D] focus:outline-none py-1.5"
            />
            <button
              type="submit"
              className="px-4 py-2 bg-[#C8A46B] text-[#0E0E10] text-xs font-semibold tracking-wider uppercase hover:bg-[#DFC391] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              Find
            </button>
            <button
              type="button"
              onClick={() => setSearchOpen(false)}
              aria-label="Close search"
              className="p-2 text-[#9C9488] hover:text-[#FAF7F0] cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </form>
        </div>
      )}

      {/* Mobile Drawer */}
      {mobileOpen && (
        <div className="lg:hidden border-t border-[#262522] bg-[#121214] px-4 py-5 space-y-4">
          <form onSubmit={handleSearchSubmit} className="flex items-center gap-2 border border-[#2A2927] bg-[#18181B] px-3 py-2">
            <Search className="w-4 h-4 text-[#C8A46B] shrink-0" aria-hidden="true" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search sarees or Product ID..."
              className="w-full bg-transparent text-sm text-[#FAF7F0] placeholder:text-[#8E877D] focus:outline-none"
            />
          </form>
          <nav className="flex flex-col space-y-1">
            {navItems.map((item) => (
              <a
                key={item.href}
                href={item.href}
                onClick={(e) => {
                  e.preventDefault();
                  handleLinkClick(item.href);
                }}
                className={`py-3 px-2 text-base font-medium border-b border-[#22211E] transition-colors ${
                  currentPath === item.href ? 'text-[#C8A46B]' : 'text-[#FAF7F0]'
                }`}
              >
                {item.label}
              </a>
            ))}
          </nav>
        </div>
      )}
    </header>
  );
}
