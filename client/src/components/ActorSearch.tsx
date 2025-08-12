import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Search } from "lucide-react";
import { Actor } from "@shared/schema";

interface ActorSearchProps {
  onSelect: (actor: Actor) => void;
  placeholder?: string;
  value?: string;
  disabled?: boolean;
}

export default function ActorSearch({ onSelect, placeholder = "Search for actor...", value = "", disabled = false }: ActorSearchProps) {
  const [open, setOpen] = useState(false);
  const [displayValue, setDisplayValue] = useState(value);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    setDisplayValue(value);
  }, [value]);

  const { data: actors = [], isLoading } = useQuery<Actor[]>({
    queryKey: ["/api/search/actors", searchQuery],
    enabled: searchQuery.length > 2,
    staleTime: 10000,
    gcTime: 20000,
  });

  const handleSelect = (actor: Actor) => {
    setDisplayValue(actor.name);
    setOpen(false);
    setSearchQuery("");
    onSelect(actor);
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
    if (searchQuery && actors.length > 0) {
      setOpen(true);
    }
  }, [actors, searchQuery]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <div className="relative flex">
          <Input
            value={displayValue}
            onChange={(e) => handleInputChange(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder={placeholder}
            disabled={disabled}
            className="flex-1 p-4 border-2 border-gray-200 rounded-l-lg focus:border-game-blue focus:outline-none transition-colors"
          />
          <Button
            onClick={handleSearch}
            disabled={disabled || displayValue.length <= 2}
            className="px-4 py-2 bg-game-blue text-white rounded-r-lg hover:bg-game-blue/90 border-2 border-l-0 border-game-blue disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Search className="w-4 h-4" />
          </Button>
        </div>
      </PopoverTrigger>
      <PopoverContent className="w-full p-0" align="start">
        <Command>
          <CommandList>
            {isLoading && (
              <CommandEmpty>Searching actors...</CommandEmpty>
            )}
            {!isLoading && actors.length === 0 && displayValue.length > 2 && (
              <CommandEmpty>No actors found.</CommandEmpty>
            )}
            {actors.length > 0 && (
              <CommandGroup>
                {actors.slice(0, 10).map((actor) => (
                  <CommandItem
                    key={actor.id}
                    value={actor.name}
                    onSelect={() => handleSelect(actor)}
                    className="cursor-pointer"
                  >
                    <div className="flex items-center space-x-3">
                      {actor.profile_path ? (
                        <img
                          src={`https://image.tmdb.org/t/p/w92${actor.profile_path}`}
                          alt={actor.name}
                          className="w-8 h-8 rounded-full object-cover"
                        />
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center">
                          <span className="text-xs font-medium text-gray-600">
                            {actor.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                          </span>
                        </div>
                      )}
                      <span>{actor.name}</span>
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