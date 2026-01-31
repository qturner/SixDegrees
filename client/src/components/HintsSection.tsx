import { Film, Lightbulb } from "lucide-react";
import { HintResponse } from "@/hooks/useHints";

interface HintsSectionProps {
  activeHint: HintResponse | null;
  hintsRemaining: number;
}

export function HintsSection({ activeHint, hintsRemaining }: HintsSectionProps) {
  if (!activeHint && hintsRemaining > 0) {
    return null;
  }

  return (
    <div className="deco-card p-6 sm:p-10 mb-8 relative overflow-hidden backdrop-blur-md bg-deco-black/40 border border-white/10">
      {/* Subtle background effects matched from TodaysChallenge */}
      <div className="absolute inset-0 bg-gradient-to-br from-indigo-900/20 via-transparent to-amber-900/20 pointer-events-none" />
      <div className="absolute inset-0 art-deco-bg opacity-20 pointer-events-none" />

      <div className="relative z-10">
        <div className="text-center mb-4">
          <h3 className="font-display text-lg sm:text-xl text-deco-gold mb-2 tracking-wide flex items-center justify-center gap-2">
            <Lightbulb className="h-5 w-5 text-deco-gold" />
            Daily Hints
          </h3>
          <p className="text-deco-cream/70 text-sm">
            <span className="inline-flex items-center px-2 py-0.5 bg-deco-gold text-deco-black text-xs font-bold">{hintsRemaining} hints</span> remaining today.
          </p>
        </div>

        <div className="space-y-4">
          {activeHint && (
            <div className="bg-deco-black/40 border border-white/10 p-4 rounded-lg backdrop-blur-sm">
              <h4 className="font-display text-deco-gold text-sm mb-3 flex items-center gap-2">
                <Film className="h-4 w-4" />
                Movies featuring {activeHint.actorName}
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {(activeHint?.movies || []).map((movie) => (
                  <div
                    key={movie.id}
                    className="p-3 rounded border border-white/10 bg-deco-black/20 hover:bg-white/5 transition-all duration-200"
                  >
                    <div className="font-medium text-sm text-deco-cream">{movie.title}</div>
                    {movie.release_date && (
                      <div className="text-xs text-deco-pewter">
                        ({new Date(movie.release_date).getFullYear()})
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {hintsRemaining === 0 && !activeHint && (
            <div className="text-center text-deco-pewter py-4 text-sm">
              You've used all your daily hints. Come back tomorrow for more!
            </div>
          )}
        </div>
      </div>
    </div>
  );
}