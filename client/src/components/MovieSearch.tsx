import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
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

  useEffect(() => {
    setDisplayValue(value);
  }, [value]);

  const { data: movies = [], isLoading } = useQuery<Movie[]>({
    queryKey: ["/api/search/movies", displayValue],
    enabled: displayValue.length > 2,
    staleTime: 10000,
    gcTime: 20000,
  });

  const handleSelect = (movie: Movie) => {
    setDisplayValue(movie.title);
    setOpen(false);
    onSelect(movie);
  };

  const handleInputChange = (value: string) => {
    setDisplayValue(value);
  };

  // Open dropdown when we have results and input is long enough
  useEffect(() => {
    if (displayValue.length > 2 && movies.length > 0) {
      setOpen(true);
    } else if (displayValue.length <= 2) {
      setOpen(false);
    }
  }, [movies, displayValue]);

  const formatYear = (date: string | undefined) => {
    if (!date) return "";
    return ` (${new Date(date).getFullYear()})`;
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <div className="relative">
          <Input
            value={displayValue}
            onChange={(e) => handleInputChange(e.target.value)}
            placeholder={placeholder}
            disabled={disabled}
            className="w-full p-4 border-2 border-gray-200 rounded-lg focus:border-game-blue focus:outline-none transition-colors pr-10"
          />
          <div className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400">
            <Search className="w-4 h-4" />
          </div>
        </div>
      </PopoverTrigger>
      <PopoverContent className="w-full p-0" align="start">
        <Command>
          <CommandList>
            {isLoading && (
              <CommandEmpty>Searching movies...</CommandEmpty>
            )}
            {!isLoading && movies.length === 0 && displayValue.length > 2 && (
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