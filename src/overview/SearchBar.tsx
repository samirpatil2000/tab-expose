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
        className="block w-full pl-11 pr-4 py-2.5 rounded-full bg-white/4 border border-white/10 backdrop-blur-xl shadow-[0_2px_6px_rgba(0,0,0,0.3)] text-white/90 text-sm placeholder-white/30 focus:outline-none focus:border-white/25 focus:shadow-[0_4px_12px_rgba(0,0,0,0.6)] focus:bg-white/10 transition-all duration-150"
        placeholder="Start typing to search tabs..."
        value={query}
        onChange={e => onQueryChange(e.target.value)}
      />
    </div>
  );
}
