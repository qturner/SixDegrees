import { useState } from "react";
import { ArrowRight, ArrowLeftRight } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Actor {
  id: number;
  name: string;
  profilePath?: string;
}

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
  gameResult 
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

  const getStatusColor = () => {
    const status = getGameStatus();
    if (status === "Ready to Start") return "text-deco-gold";
    if (status === "Complete") return "text-game-success";
    if (status === "Game Over") return "text-game-error";
    return "text-deco-gold-light";
  };

  return (
    <div className="deco-card deco-corners p-6 sm:p-8 mb-6 sm:mb-8 relative overflow-hidden">
      {/* Subtle pattern overlay */}
      <div className="absolute inset-0 art-deco-bg opacity-20 pointer-events-none" />
      
      <div className="text-center mb-4 sm:mb-6 relative z-10">
        <h2 className="font-display text-xl sm:text-2xl text-deco-gold mb-2 tracking-wide">Today's Challenge</h2>
        
        {/* Decorative divider */}
        <div className="flex items-center justify-center gap-3 mb-6">
          <div className="h-px w-12 bg-gradient-to-r from-transparent to-deco-gold/40" />
          <div className="w-1.5 h-1.5 rotate-45 bg-deco-gold/60" />
          <div className="h-px w-12 bg-gradient-to-l from-transparent to-deco-gold/40" />
        </div>
        
        <div className="flex flex-col sm:flex-row items-center justify-center space-y-4 sm:space-y-0 sm:space-x-8 mb-6">
          {/* Start Actor Card */}
          <div className="relative bg-gradient-to-br from-deco-charcoal to-deco-onyx border-2 border-deco-gold text-deco-cream px-4 py-3 sm:px-6 sm:py-4 font-medium w-full sm:w-auto transition-all duration-300 hover:shadow-card-hover hover:border-deco-gold-light flex items-center justify-center min-h-[80px]">
            <div className="absolute left-3 sm:left-4 flex items-center">
              {displayChallenge.startActorProfilePath ? (
                <img
                  src={`https://image.tmdb.org/t/p/w154${displayChallenge.startActorProfilePath}`}
                  alt={displayChallenge.startActorName}
                  className="w-14 h-14 sm:w-16 sm:h-16 rounded-full object-cover border-2 border-deco-gold flex-shrink-0 transition-all duration-200 cursor-pointer select-none hover:border-deco-gold-light"
                  onClick={() => handleImageClick(displayChallenge.startActorName, displayChallenge.startActorProfilePath)}
                />
              ) : (
                <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-deco-gold/20 flex items-center justify-center border-2 border-deco-gold flex-shrink-0">
                  <span className="text-lg font-display font-medium text-deco-gold">
                    {displayChallenge.startActorName.split(' ').map(n => n[0]).join('').slice(0, 2)}
                  </span>
                </div>
              )}
            </div>
            <span className="truncate text-center pl-16 sm:pl-20 pr-2 font-display tracking-wide">{displayChallenge.startActorName}</span>
          </div>
          
          {/* Arrow */}
          <div className="text-deco-gold rotate-90 sm:rotate-0 transition-transform duration-300">
            <ArrowRight className="w-6 h-6 sm:w-8 sm:h-8" />
          </div>
          
          {/* End Actor Card */}
          <div className="relative bg-gradient-to-br from-deco-charcoal to-deco-onyx border-2 border-deco-gold text-deco-cream px-4 py-3 sm:px-6 sm:py-4 font-medium w-full sm:w-auto transition-all duration-300 hover:shadow-card-hover hover:border-deco-gold-light flex items-center justify-center min-h-[80px]">
            <div className="absolute left-3 sm:left-4 flex items-center">
              {displayChallenge.endActorProfilePath ? (
                <img
                  src={`https://image.tmdb.org/t/p/w154${displayChallenge.endActorProfilePath}`}
                  alt={displayChallenge.endActorName}
                  className="w-14 h-14 sm:w-16 sm:h-16 rounded-full object-cover border-2 border-deco-gold flex-shrink-0 transition-all duration-200 cursor-pointer select-none hover:border-deco-gold-light"
                  onClick={() => handleImageClick(displayChallenge.endActorName, displayChallenge.endActorProfilePath)}
                />
              ) : (
                <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-deco-gold/20 flex items-center justify-center border-2 border-deco-gold flex-shrink-0">
                  <span className="text-lg font-display font-medium text-deco-gold">
                    {displayChallenge.endActorName.split(' ').map(n => n[0]).join('').slice(0, 2)}
                  </span>
                </div>
              )}
            </div>
            <span className="truncate text-center pl-16 sm:pl-20 pr-2 font-display tracking-wide">{displayChallenge.endActorName}</span>
          </div>
        </div>
        
        <div className="flex flex-col sm:flex-row items-center justify-center space-y-3 sm:space-y-0 sm:space-x-6 text-sm">
          <div className="flex items-center space-x-4">
            <span className={`font-medium ${getStatusColor()}`}>
              Status: {getGameStatus()}
            </span>
            <span className="text-deco-pewter">
              Moves: <span className="text-deco-gold">{currentMoves}/6</span>
            </span>
          </div>
          
          {onFlip && (
            <Button
              onClick={onFlip}
              disabled={!canFlip}
              variant="outline"
              size="sm"
              className="border-deco-gold/50 text-deco-gold hover:bg-deco-gold/10 hover:border-deco-gold text-xs uppercase tracking-wider transition-all duration-200"
            >
              <ArrowLeftRight className="w-3 h-3 mr-2" />
              Switch Starting Actor
            </Button>
          )}
        </div>
      </div>

      {/* Zoom Modal Overlay */}
      {zoomedActor && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center bg-deco-black/90 cursor-pointer backdrop-blur-sm"
          onClick={handleCloseModal}
        >
          <div className="flex flex-col items-center" onClick={(e) => e.stopPropagation()}>
            <img
              src={`https://image.tmdb.org/t/p/w342${zoomedActor.profilePath}`}
              alt={zoomedActor.name}
              className="w-64 h-64 sm:w-80 sm:h-80 rounded-full object-cover border-4 border-deco-gold shadow-2xl"
            />
            <p className="mt-4 font-display text-deco-cream text-xl tracking-wide">{zoomedActor.name}</p>
          </div>
        </div>
      )}
    </div>
  );
}
