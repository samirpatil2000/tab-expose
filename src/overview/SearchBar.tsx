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
        <Search className="h-5 w-5 text-gray-400" />
      </div>
      <input
        ref={inputRef}
        type="text"
        className="block w-full pl-11 pr-4 py-3 bg-[#2a2a2a] border border-transparent rounded-xl leading-5 bg-opacity-80 text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#4c9aff] focus:border-transparent sm:text-sm transition-shadow shadow-lg backdrop-blur"
        placeholder="Search tabs by title, URL, or domain... (Cmd+F)"
        value={query}
        onChange={e => onQueryChange(e.target.value)}
      />
    </div>
  );
}
