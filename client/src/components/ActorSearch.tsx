import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
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
  const [search, setSearch] = useState("");
  const [displayValue, setDisplayValue] = useState(value);

  useEffect(() => {
    setDisplayValue(value);
  }, [value]);

  const { data: actors = [], isLoading } = useQuery<Actor[]>({
    queryKey: ["/api/search/actors", search],
    enabled: search.length > 2,
    staleTime: 5000, // Cache for 5 seconds
    gcTime: 10000, // Keep in cache for 10 seconds
  });

  const handleSelect = (actor: Actor) => {
    setDisplayValue(actor.name);
    setOpen(false);
    setSearch("");
    onSelect(actor);
  };

  const handleInputChange = (value: string) => {
    setDisplayValue(value);
    setSearch(value);
    if (value.length > 2) {
      setOpen(true);
    } else {
      setOpen(false);
    }
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
              <CommandEmpty>Searching actors...</CommandEmpty>
            )}
            {!isLoading && actors.length === 0 && search.length > 2 && (
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
