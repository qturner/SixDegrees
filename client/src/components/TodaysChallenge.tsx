import { ArrowLeftRight, Infinity } from "lucide-react";
import { Button } from "@/components/ui/button";
import { HintResponse } from "@/hooks/useHints";
import ActorCard from "./ActorCard";

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
        {/* Actors Row */}
        <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 sm:gap-8 w-full mb-8 max-w-2xl mx-auto">

          {/* Start Actor (Left - Blue/Cyan Theme) */}
          <div className="justify-self-center">
            <ActorCard
              name={displayChallenge.startActorName}
              profilePath={displayChallenge.startActorProfilePath}
              variant="cyan"
              size="md"
            >
              <button
                onClick={() => onHint('start')}
                disabled={(hintsRemaining <= 0 && !startActorHint) || loadingHintType === 'start'}
                className={`text-sm tracking-widest uppercase py-1 px-3 rounded transition-all duration-300 mt-2 ${startActorHint
                  ? 'text-cyan-300 font-semibold drop-shadow-[0_0_5px_rgba(103,232,249,0.8)]'
                  : 'text-white/60 hover:text-cyan-300 hover:drop-shadow-[0_0_5px_rgba(103,232,249,0.5)]'
                  }`}
              >
                {loadingHintType === 'start' ? 'Loading...' : (startActorHint ? 'View Hint' : 'Show Hint')}
              </button>
            </ActorCard>
          </div>

          {/* Infinity Icon (Center) */}
          <div className="flex justify-center items-center text-deco-gold drop-shadow-[0_4px_3px_rgba(0,0,0,0.6)] filter backdrop-blur-sm transform scale-150 sm:scale-[2.0] animate-pulse-slow">
            <Infinity strokeWidth={2} className="drop-shadow-[0_1px_2px_rgba(255,255,255,0.3)]" />
          </div>

          {/* End Actor (Right - Gold/Yellow Theme) */}
          <div className="justify-self-center">
            <ActorCard
              name={displayChallenge.endActorName}
              profilePath={displayChallenge.endActorProfilePath}
              variant="amber"
              size="md"
            >
              <button
                onClick={() => onHint('end')}
                disabled={(hintsRemaining <= 0 && !endActorHint) || loadingHintType === 'end'}
                className={`text-sm tracking-widest uppercase py-1 px-3 rounded transition-all duration-300 mt-2 ${endActorHint
                  ? 'text-amber-300 font-semibold drop-shadow-[0_0_5px_rgba(252,211,77,0.8)]'
                  : 'text-white/60 hover:text-amber-300 hover:drop-shadow-[0_0_5px_rgba(252,211,77,0.5)]'
                  }`}
              >
                {loadingHintType === 'end' ? 'Loading...' : (endActorHint ? 'View Hint' : 'Show Hint')}
              </button>
            </ActorCard>
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

    </div>
  );
}
