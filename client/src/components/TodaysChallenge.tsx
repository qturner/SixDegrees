import { useState } from "react";
import { ArrowLeftRight, Infinity } from "lucide-react";
import { Button } from "@/components/ui/button";
import { HintResponse } from "@/hooks/useHints";

interface Challenge {
  id: string;
  startActorId: number;
  startActorName: string;
  startActorProfilePath?: string | null;
  endActorId: number;
  endActorName: string;
  endActorProfilePath?: string | null;
  date: string;
}

interface GameResult {
  valid: boolean;
  completed?: boolean;
  message?: string;
}

interface TodaysChallengeProps {
  challenge: Challenge;
  currentMoves: number;
  isFlipped: boolean;
  onFlip?: () => void;
  canFlip?: boolean;
  gameResult?: GameResult | null;
  // Hint props
  onHint: (type: 'start' | 'end') => void;
  hintsRemaining: number;
  loadingHintType: 'start' | 'end' | null;
  startActorHint: HintResponse | null;
  endActorHint: HintResponse | null;
}

interface ZoomedActor {
  name: string;
  profilePath: string;
}

export default function TodaysChallenge({
  challenge,
  currentMoves,
  isFlipped,
  onFlip,
  canFlip = false,
  gameResult,
  onHint,
  hintsRemaining,
  loadingHintType,
  startActorHint,
  endActorHint
}: TodaysChallengeProps) {
  const [zoomedActor, setZoomedActor] = useState<ZoomedActor | null>(null);

  const handleImageClick = (name: string, profilePath: string | null | undefined) => {
    if (profilePath) {
      setZoomedActor({ name, profilePath });
    }
  };

  const handleCloseModal = () => {
    setZoomedActor(null);
  };

  const displayChallenge = isFlipped
    ? {
      ...challenge,
      startActorId: challenge.endActorId,
      startActorName: challenge.endActorName,
      startActorProfilePath: challenge.endActorProfilePath,
      endActorId: challenge.startActorId,
      endActorName: challenge.startActorName,
      endActorProfilePath: challenge.startActorProfilePath,
    }
    : challenge;

  const getGameStatus = () => {
    if (gameResult?.valid && gameResult?.completed) return "Complete";
    if (currentMoves === 0) return "Ready to Start";
    if (currentMoves >= 6) return "Game Over";
    return "In Progress";
  };

  const status = getGameStatus();

  return (
    <div className="deco-card deco-corners p-6 sm:p-10 mb-6 sm:mb-8 relative overflow-hidden backdrop-blur-md bg-deco-black/40 border border-white/10">
      {/* Subtle background effects */}
      <div className="absolute inset-0 bg-gradient-to-br from-indigo-900/20 via-transparent to-amber-900/20 pointer-events-none" />

      {/* Main Content Container */}
      <div className="relative z-10 flex flex-col items-center">

        {/* Actors Row */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-8 sm:gap-16 w-full mb-8">

          {/* Start Actor (Left - Blue/Cyan Theme) */}
          <div className="flex flex-col items-center group">
            <div className="relative mb-3">
              {/* Glow Effect */}
              <div className="absolute -inset-2 rounded-full bg-cyan-500/30 blur-md group-hover:bg-cyan-400/50 transition-all duration-500 opacity-60" />

              {/* Image Container with Ring */}
              <div className="relative w-32 h-32 sm:w-40 sm:h-40 rounded-full p-1 bg-gradient-to-b from-cyan-300 to-cyan-600 shadow-[0_0_20px_rgba(34,211,238,0.4)]">
                <div className="w-full h-full rounded-full border-4 border-black overflow-hidden bg-black relative">
                  {displayChallenge.startActorProfilePath ? (
                    <img
                      src={displayChallenge.startActorProfilePath.startsWith('http')
                        ? displayChallenge.startActorProfilePath
                        : `https://image.tmdb.org/t/p/w185${displayChallenge.startActorProfilePath}`}
                      alt={displayChallenge.startActorName}
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110 cursor-pointer"
                      onClick={() => handleImageClick(displayChallenge.startActorName, displayChallenge.startActorProfilePath)}
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-zinc-900 text-cyan-400 font-bold text-2xl">
                      {displayChallenge.startActorName.charAt(0)}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Name */}
            <h3 className="text-xl sm:text-2xl font-display font-bold text-white tracking-wide mb-2 text-center drop-shadow-md">
              {displayChallenge.startActorName}
            </h3>

            {/* Hint Button */}
            <button
              onClick={() => onHint('start')}
              disabled={(hintsRemaining <= 0 && !startActorHint) || loadingHintType === 'start'}
              className={`text-sm tracking-widest uppercase py-1 px-3 rounded transition-all duration-300 ${startActorHint
                  ? 'text-cyan-300 font-semibold drop-shadow-[0_0_5px_rgba(103,232,249,0.8)]'
                  : 'text-white/60 hover:text-cyan-300 hover:drop-shadow-[0_0_5px_rgba(103,232,249,0.5)]'
                }`}
            >
              {loadingHintType === 'start' ? 'Loading...' : (startActorHint ? 'View Hint' : 'Show Hint')}
            </button>
          </div>

          {/* Infinity Icon (Center) */}
          <div className="text-deco-cream/80 drop-shadow-[0_0_10px_rgba(255,255,255,0.3)] transform scale-150 sm:scale-[2.0] opacity-80 animate-pulse-slow">
            <Infinity strokeWidth={1.5} />
          </div>

          {/* End Actor (Right - Gold/Yellow Theme) */}
          <div className="flex flex-col items-center group">
            <div className="relative mb-3">
              {/* Glow Effect */}
              <div className="absolute -inset-2 rounded-full bg-amber-500/30 blur-md group-hover:bg-amber-400/50 transition-all duration-500 opacity-60" />

              {/* Image Container with Ring */}
              <div className="relative w-32 h-32 sm:w-40 sm:h-40 rounded-full p-1 bg-gradient-to-b from-amber-300 to-amber-600 shadow-[0_0_20px_rgba(251,191,36,0.4)]">
                <div className="w-full h-full rounded-full border-4 border-black overflow-hidden bg-black relative">
                  {displayChallenge.endActorProfilePath ? (
                    <img
                      src={displayChallenge.endActorProfilePath.startsWith('http')
                        ? displayChallenge.endActorProfilePath
                        : `https://image.tmdb.org/t/p/w185${displayChallenge.endActorProfilePath}`}
                      alt={displayChallenge.endActorName}
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110 cursor-pointer"
                      onClick={() => handleImageClick(displayChallenge.endActorName, displayChallenge.endActorProfilePath)}
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-zinc-900 text-amber-400 font-bold text-2xl">
                      {displayChallenge.endActorName.charAt(0)}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Name */}
            <h3 className="text-xl sm:text-2xl font-display font-bold text-white tracking-wide mb-2 text-center drop-shadow-md">
              {displayChallenge.endActorName}
            </h3>

            {/* Hint Button */}
            <button
              onClick={() => onHint('end')}
              disabled={(hintsRemaining <= 0 && !endActorHint) || loadingHintType === 'end'}
              className={`text-sm tracking-widest uppercase py-1 px-3 rounded transition-all duration-300 ${endActorHint
                  ? 'text-amber-300 font-semibold drop-shadow-[0_0_5px_rgba(252,211,77,0.8)]'
                  : 'text-white/60 hover:text-amber-300 hover:drop-shadow-[0_0_5px_rgba(252,211,77,0.5)]'
                }`}
            >
              {loadingHintType === 'end' ? 'Loading...' : (endActorHint ? 'View Hint' : 'Show Hint')}
            </button>
          </div>
        </div>

        {/* Status & Helper Info */}
        <div className="flex flex-col sm:flex-row items-center justify-center w-full gap-4 text-sm mt-4">
          <div className="flex items-center gap-4 bg-black/30 px-4 py-2 rounded-full border border-white/10">
            <span className="text-white/80">Status: <span className={
              status === "Complete" ? "text-green-400 font-bold" :
                status === "Game Over" ? "text-red-400 font-bold" :
                  "text-deco-gold font-bold"
            }>{status}</span></span>
            <span className="text-white/40">|</span>
            <span className="text-white/80">Moves: <span className="text-deco-gold font-bold">{currentMoves}/6</span></span>
          </div>

          {onFlip && (
            <Button
              onClick={onFlip}
              disabled={!canFlip}
              variant="ghost"
              size="sm"
              className="text-white/50 hover:text-white hover:bg-white/10 text-xs uppercase tracking-wider"
            >
              <ArrowLeftRight className="w-3 h-3 mr-2" />
              Flip Actors
            </Button>
          )}
        </div>

      </div>

      {/* Zoom Modal Overlay */}
      {zoomedActor && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/95 cursor-pointer backdrop-blur-md"
          onClick={handleCloseModal}
        >
          <div className="flex flex-col items-center animate-in fade-in zoom-in duration-300" onClick={(e) => e.stopPropagation()}>
            <img
              src={zoomedActor.profilePath.startsWith('http')
                ? zoomedActor.profilePath
                : `https://image.tmdb.org/t/p/w500${zoomedActor.profilePath}`}
              alt={zoomedActor.name}
              className="w-72 h-72 sm:w-96 sm:h-96 rounded-full object-cover border-4 border-deco-gold shadow-[0_0_50px_rgba(196,151,49,0.3)]"
            />
            <p className="mt-6 font-display text-white text-3xl tracking-wide drop-shadow-lg">{zoomedActor.name}</p>
          </div>
        </div>
      )}
    </div>
  );
}
