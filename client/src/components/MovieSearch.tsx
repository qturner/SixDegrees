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
    enabled: searchQuery.length > 2,
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
    if (displayValue.length > 2) {
      setSearchQuery(displayValue);
      setOpen(true);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  // Open dropdown when we have search results
  useEffect(() => {
    if (searchQuery && movies.length > 0) {
      setOpen(true);
    }
  }, [movies, searchQuery]);

  const formatYear = (date: string | undefined) => {
    if (!date) return "";
    return ` (${new Date(date).getFullYear()})`;
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <div className="relative flex">
        <PopoverTrigger asChild>
          <Input
            value={displayValue}
            onChange={(e) => handleInputChange(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder={placeholder}
            disabled={disabled}
            className="flex-1 p-4 border-2 border-gray-200 rounded-l-lg focus:border-game-blue focus:outline-none transition-colors ml-[5px] mr-[5px]"
            data-testid="input-movie-search"
          />
        </PopoverTrigger>
        <Button
          onClick={handleSearch}
          disabled={disabled || displayValue.length <= 2}
          className="px-4 py-2 bg-game-blue text-white rounded-r-lg hover:bg-game-blue/90 border-2 border-l-0 border-game-blue disabled:opacity-50 disabled:cursor-not-allowed"
          data-testid="button-movie-search"
        >
          <Search className="w-4 h-4" />
        </Button>
      </div>
      <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
        <Command>
          <CommandList>
            {isLoading && (
              <CommandEmpty>Searching movies...</CommandEmpty>
            )}
            {!isLoading && movies.length === 0 && searchQuery.length > 2 && (
              <CommandEmpty>No movies found.</CommandEmpty>
            )}
            {movies.length > 0 && (
              <CommandGroup>
                {movies.slice(0, 10).map((movie) => (
                  <CommandItem
                    key={movie.id}
                    value={movie.title}
                    onSelect={() => handleSelect(movie)}
                    className="cursor-pointer"
                  >
                    <div className="flex items-center space-x-3">
                      {movie.poster_path ? (
                        <img
                          src={`https://image.tmdb.org/t/p/w92${movie.poster_path}`}
                          alt={movie.title}
                          className="w-8 h-12 object-cover rounded"
                        />
                      ) : (
                        <div className="w-8 h-12 bg-gray-200 flex items-center justify-center rounded">
                          <span className="text-xs font-medium text-gray-600">
                            {movie.title.split(' ').map(n => n[0]).join('').slice(0, 2)}
                          </span>
                        </div>
                      )}
                      <div>
                        <div className="font-medium">{movie.title}</div>
                        <div className="text-sm text-gray-500">
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
      </PopoverContent>
    </Popover>
  );
}