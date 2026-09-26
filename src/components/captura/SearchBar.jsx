import React, { useState, useEffect } from 'react';
import { Search, X } from 'lucide-react';
import { Input } from '../ui/Input';

export function SearchBar({ onSearch, placeholder = "Buscar producto por nombre o código..." }) {
  const [query, setQuery] = useState('');

  // Debounce the search query slightly to avoid blocking the main thread on every keystroke
  useEffect(() => {
    const timer = setTimeout(() => {
      onSearch(query);
    }, 150);
    return () => clearTimeout(timer);
  }, [query, onSearch]);

  return (
    <div className="relative w-full">
      <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-muted-foreground">
        <Search className="w-5 h-5" />
      </div>
      <Input
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder={placeholder}
        className="pl-10 pr-10 h-12 bg-card rounded-xl border-border shadow-sm text-base"
        autoComplete="off"
        spellCheck="false"
      />
      {query && (
        <button
          onClick={() => setQuery('')}
          className="absolute inset-y-0 right-0 flex items-center pr-3 text-muted-foreground hover:text-foreground transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
      )}
    </div>
  );
}
