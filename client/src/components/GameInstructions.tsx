import { HelpCircle, Trophy } from "lucide-react";

export default function GameInstructions() {
  return (
    <div id="how-to-play" className="deco-card p-6 sm:p-8 mb-8 relative overflow-hidden backdrop-blur-md bg-deco-black/40 border border-white/10">
      {/* Subtle background effects */}
      <div className="absolute inset-0 bg-gradient-to-br from-indigo-900/20 via-transparent to-amber-900/20 pointer-events-none" />
      {/* Subtle pattern overlay */}
      <div className="absolute inset-0 art-deco-bg opacity-20 pointer-events-none" />

      <div className="relative z-10">
        <h3 className="font-display text-xl sm:text-2xl text-deco-gold mb-2 text-center tracking-wide">
          <HelpCircle className="inline-block w-5 h-5 mr-2 mb-1" />
          How to Play
        </h3>

        {/* Decorative divider */}
        <div className="flex items-center justify-center gap-3 mb-6">
          <div className="h-px w-12 bg-gradient-to-r from-transparent to-deco-gold/40" />
          <div className="w-1.5 h-1.5 rotate-45 bg-deco-gold/60" />
          <div className="h-px w-12 bg-gradient-to-l from-transparent to-deco-gold/40" />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div>
            <h4 className="font-display text-lg text-deco-gold mb-4 tracking-wide">Game Rules</h4>
            <ul className="space-y-3 text-deco-cream/90">
              <li className="flex items-start">
                <span className="w-6 h-6 bg-gradient-to-br from-deco-gold to-deco-bronze text-deco-black text-sm font-bold flex items-center justify-center mr-3 mt-0.5 flex-shrink-0">1</span>
                <span>Connect two actors through movies in six moves or less</span>
              </li>
              <li className="flex items-start">
                <span className="w-6 h-6 bg-gradient-to-br from-deco-gold to-deco-bronze text-deco-black text-sm font-bold flex items-center justify-center mr-3 mt-0.5 flex-shrink-0">2</span>
                <span>Use your daily hints if you're stuck</span>
              </li>
              <li className="flex items-start">
                <span className="w-6 h-6 bg-gradient-to-br from-deco-gold to-deco-bronze text-deco-black text-sm font-bold flex items-center justify-center mr-3 mt-0.5 flex-shrink-0">3</span>
                <span>Press "Validate" once completed to verify your results!</span>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="font-display text-lg text-deco-gold mb-4 tracking-wide">Example Chain</h4>
            <div className="space-y-2 text-sm">
              <div className="bg-deco-black/50 border border-deco-gold/30 p-3 transition-all duration-200 hover:border-deco-gold/60 hover:bg-deco-gold/5">
                <span className="font-medium text-deco-gold">Jack Black</span>
                <span className="text-deco-pewter"> in </span>
                <span className="font-medium text-deco-cream">Tropic Thunder</span>
                <span className="text-deco-pewter"> with </span>
                <span className="font-medium text-deco-gold">Ben Stiller</span>
              </div>
              <div className="bg-deco-black/50 border border-deco-gold/30 p-3 transition-all duration-200 hover:border-deco-gold/60 hover:bg-deco-gold/5">
                <span className="font-medium text-deco-gold">Ben Stiller</span>
                <span className="text-deco-pewter"> in </span>
                <span className="font-medium text-deco-cream">Meet the Parents</span>
                <span className="text-deco-pewter"> with </span>
                <span className="font-medium text-deco-gold">Robert De Niro</span>
              </div>
              <div className="bg-deco-black/50 border border-deco-gold/30 p-3 transition-all duration-200 hover:border-deco-gold/60 hover:bg-deco-gold/5">
                <span className="font-medium text-deco-gold">Robert De Niro</span>
                <span className="text-deco-pewter"> in </span>
                <span className="font-medium text-deco-cream">Heat</span>
                <span className="text-deco-pewter"> with </span>
                <span className="font-medium text-deco-gold">Al Pacino</span>
              </div>
              <div className="text-center mt-4 py-2 border border-game-success/30 bg-game-success/10">
                <span className="text-game-success font-medium">
                  <Trophy className="inline-block w-4 h-4 mr-2" />
                  Connection made in 3 moves!
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
