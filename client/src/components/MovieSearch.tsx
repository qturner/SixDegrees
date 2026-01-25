import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Search } from "lucide-react";
import { Movie } from "@shared/schema";

interface MovieSearchProps {
  onSelect: (movie: Movie) => void;
  placeholder?: string;
  value?: string;
  disabled?: boolean;
}

export default function MovieSearch({ onSelect, placeholder = "Search for movie...", value = "", disabled = false }: MovieSearchProps) {
  const [open, setOpen] = useState(false);
  const [displayValue, setDisplayValue] = useState(value);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    setDisplayValue(value);
  }, [value]);

  const { data: movies = [], isLoading } = useQuery<Movie[]>({
    queryKey: [`/api/search/movies?q=${encodeURIComponent(searchQuery)}`],
    enabled: searchQuery.length >= 2,
    staleTime: 10000,
    gcTime: 20000,
  });

  const handleSelect = (movie: Movie) => {
    setDisplayValue(movie.title);
    setOpen(false);
    setSearchQuery("");
    onSelect(movie);
  };

  const handleInputChange = (value: string) => {
    setDisplayValue(value);
  };

  const handleSearch = () => {
    if (displayValue.length >= 2) {
      setSearchQuery(displayValue);
      setOpen(true);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  const handleFocus = () => {
    // Just ensure input is ready for typing - no automatic search
    // This fixes the double-click issue without triggering unwanted searches
  };

  // Open dropdown when we have search results
  useEffect(() => {
    if (searchQuery && movies.length > 0) {
      setOpen(true);
    }
  }, [movies, searchQuery]);

  // Close dropdown when input field is completely cleared
  useEffect(() => {
    if (displayValue.length === 0) {
      setOpen(false);
    }
  }, [displayValue]);

  const formatYear = (date: string | undefined) => {
    if (!date) return "";
    return ` (${new Date(date).getFullYear()})`;
  };

  return (
    <div className="relative">
      <div className="relative flex gap-2 items-stretch">
        <Input
          value={displayValue}
          onChange={(e) => handleInputChange(e.target.value)}
          onFocus={handleFocus}
          onKeyPress={handleKeyPress}
          placeholder={placeholder}
          disabled={disabled}
          className="flex-1 p-3 bg-deco-onyx border border-deco-gold/30 focus:border-deco-gold focus:outline-none transition-colors text-deco-cream placeholder:text-deco-pewter shadow-[0_8px_32px_rgba(196,151,49,0.2)] focus:shadow-[0_12px_40px_rgba(196,151,49,0.4)]"
        />
        <Button
          onClick={handleSearch}
          disabled={disabled || displayValue.length < 2}
          className="px-4 py-2 bg-deco-gold text-deco-black hover:bg-deco-gold-light border border-deco-gold disabled:opacity-50 disabled:cursor-not-allowed shrink-0 shadow-[0_8px_32px_rgba(196,151,49,0.3)] hover:shadow-[0_12px_40px_rgba(196,151,49,0.5)]"
        >
          <Search className="w-4 h-4" />
        </Button>
      </div>
      {open && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-deco-charcoal border border-deco-gold/40 shadow-lg z-50">
          <Command className="bg-transparent">
            <CommandList className="bg-transparent">
              {isLoading && (
                <CommandEmpty className="text-deco-pewter py-3">Searching movies...</CommandEmpty>
              )}
              {!isLoading && movies.length === 0 && searchQuery.length >= 2 && (
                <CommandEmpty className="text-deco-pewter py-3">No movies found.</CommandEmpty>
              )}
              {movies.length > 0 && (
                <CommandGroup>
                  {movies.slice(0, 10).map((movie) => (
                    <CommandItem
                      key={movie.id}
                      value={movie.title}
                      onSelect={() => handleSelect(movie)}
                      className="cursor-pointer hover:bg-deco-gold/10 text-deco-cream data-[selected=true]:bg-deco-gold/20"
                    >
                      <div className="flex items-center space-x-3">
                        {movie.poster_path ? (
                          <img
                            src={movie.poster_path.startsWith('http') ? movie.poster_path : `https://image.tmdb.org/t/p/w92${movie.poster_path}`}
                            alt={movie.title}
                            className="w-8 h-12 object-cover border border-deco-gold/30"
                          />
                        ) : (
                          <div className="w-8 h-12 bg-deco-gold/20 flex items-center justify-center border border-deco-gold/30">
                            <span className="text-xs font-medium text-deco-gold">
                              {movie.title.split(' ').map((n: string) => n[0]).join('').slice(0, 2)}
                            </span>
                          </div>
                        )}
                        <div>
                          <div className="font-medium text-deco-cream">{movie.title}</div>
                          <div className="text-sm text-deco-pewter">
                            {formatYear(movie.release_date)}
                          </div>
                        </div>
                      </div>
                    </CommandItem>
                  ))}
                </CommandGroup>
              )}
            </CommandList>
          </Command>
        </div>
      )}
    </div>
  );
}