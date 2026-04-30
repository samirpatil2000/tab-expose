import { Search } from 'lucide-react';

interface SearchBarProps {
  query: string;
  onQueryChange: (query: string) => void;
  inputRef?: React.RefObject<HTMLInputElement | null>;
}

export function SearchBar({ query, onQueryChange, inputRef }: SearchBarProps) {
  return (
    <div className="relative w-full max-w-xl mx-auto mb-6">
      <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
        <Search className="h-4 w-4 text-white/30" />
      </div>
      <input
        ref={inputRef}
        type="text"
        className="block w-full pl-11 pr-4 py-2.5 rounded-full bg-white/4 border border-white/10 backdrop-blur-xl shadow-2xl ring-1 ring-black/40 text-white/90 text-sm placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-[#4c9aff] focus:border-transparent transition-shadow"
        placeholder="Start typing to search tabs..."
        value={query}
        onChange={e => onQueryChange(e.target.value)}
      />
    </div>
  );
}
