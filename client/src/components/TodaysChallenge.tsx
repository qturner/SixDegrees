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
          <div className="group relative w-full sm:w-auto">
            {/* Spotlight/glow effect behind card */}
            <div className="absolute -inset-1 bg-gradient-to-br from-deco-gold/30 via-deco-bronze/20 to-transparent rounded-lg blur-md opacity-60 group-hover:opacity-100 transition-opacity duration-300" />
            
            {/* Main card */}
            <div className="relative bg-gradient-to-br from-deco-charcoal via-deco-onyx to-deco-black border-2 border-deco-gold/80 overflow-hidden shadow-[0_8px_32px_rgba(196,151,49,0.3)] group-hover:shadow-[0_12px_40px_rgba(196,151,49,0.5)] transition-all duration-300 group-hover:border-deco-gold px-4 py-3 sm:px-6 sm:py-4 min-h-[80px]">
              {/* Corner accents */}
              <div className="absolute top-0 left-0 w-3 h-3 border-t-2 border-l-2 border-deco-gold" />
              <div className="absolute top-0 right-0 w-3 h-3 border-t-2 border-r-2 border-deco-gold" />
              <div className="absolute bottom-0 left-0 w-3 h-3 border-b-2 border-l-2 border-deco-gold" />
              <div className="absolute bottom-0 right-0 w-3 h-3 border-b-2 border-r-2 border-deco-gold" />
              
              {/* Content - photo on left, name centered in full card */}
              <div className="relative min-h-[56px] sm:min-h-[64px]">
                {/* Photo with ring glow - absolute positioned on left */}
                <div className="absolute left-0 top-1/2 -translate-y-1/2 z-10">
                  <div className="absolute -inset-1 bg-gradient-to-br from-deco-gold via-deco-bronze to-deco-gold rounded-full opacity-70 blur-sm" />
                  {displayChallenge.startActorProfilePath ? (
                    <img
                      src={`https://image.tmdb.org/t/p/w154${displayChallenge.startActorProfilePath}`}
                      alt={displayChallenge.startActorName}
                      className="relative w-14 h-14 sm:w-16 sm:h-16 rounded-full object-cover border-2 border-deco-gold shadow-lg cursor-pointer select-none transition-transform duration-200 hover:scale-105"
                      onClick={() => handleImageClick(displayChallenge.startActorName, displayChallenge.startActorProfilePath)}
                    />
                  ) : (
                    <div className="relative w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-gradient-to-br from-deco-gold/30 to-deco-bronze/30 flex items-center justify-center border-2 border-deco-gold">
                      <span className="text-lg font-display font-bold text-deco-gold">
                        {displayChallenge.startActorName.split(' ').map(n => n[0]).join('').slice(0, 2)}
                      </span>
                    </div>
                  )}
                </div>
                
                {/* Name - absolutely centered in full card width */}
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="font-display text-base sm:text-lg text-deco-cream tracking-wide drop-shadow-[0_2px_4px_rgba(0,0,0,0.5)]">
                    {displayChallenge.startActorName}
                  </span>
                </div>
              </div>
            </div>
          </div>
          
          {/* Arrow */}
          <div className="text-deco-gold rotate-90 sm:rotate-0 transition-transform duration-300 drop-shadow-[0_0_8px_rgba(196,151,49,0.5)]">
            <ArrowRight className="w-6 h-6 sm:w-8 sm:h-8" />
          </div>
          
          {/* End Actor Card */}
          <div className="group relative w-full sm:w-auto">
            {/* Spotlight/glow effect behind card */}
            <div className="absolute -inset-1 bg-gradient-to-br from-deco-gold/30 via-deco-bronze/20 to-transparent rounded-lg blur-md opacity-60 group-hover:opacity-100 transition-opacity duration-300" />
            
            {/* Main card */}
            <div className="relative bg-gradient-to-br from-deco-charcoal via-deco-onyx to-deco-black border-2 border-deco-gold/80 overflow-hidden shadow-[0_8px_32px_rgba(196,151,49,0.3)] group-hover:shadow-[0_12px_40px_rgba(196,151,49,0.5)] transition-all duration-300 group-hover:border-deco-gold px-4 py-3 sm:px-6 sm:py-4 min-h-[80px]">
              {/* Corner accents */}
              <div className="absolute top-0 left-0 w-3 h-3 border-t-2 border-l-2 border-deco-gold" />
              <div className="absolute top-0 right-0 w-3 h-3 border-t-2 border-r-2 border-deco-gold" />
              <div className="absolute bottom-0 left-0 w-3 h-3 border-b-2 border-l-2 border-deco-gold" />
              <div className="absolute bottom-0 right-0 w-3 h-3 border-b-2 border-r-2 border-deco-gold" />
              
              {/* Content - photo on left, name centered in full card */}
              <div className="relative min-h-[56px] sm:min-h-[64px]">
                {/* Photo with ring glow - absolute positioned on left */}
                <div className="absolute left-0 top-1/2 -translate-y-1/2 z-10">
                  <div className="absolute -inset-1 bg-gradient-to-br from-deco-gold via-deco-bronze to-deco-gold rounded-full opacity-70 blur-sm" />
                  {displayChallenge.endActorProfilePath ? (
                    <img
                      src={`https://image.tmdb.org/t/p/w154${displayChallenge.endActorProfilePath}`}
                      alt={displayChallenge.endActorName}
                      className="relative w-14 h-14 sm:w-16 sm:h-16 rounded-full object-cover border-2 border-deco-gold shadow-lg cursor-pointer select-none transition-transform duration-200 hover:scale-105"
                      onClick={() => handleImageClick(displayChallenge.endActorName, displayChallenge.endActorProfilePath)}
                    />
                  ) : (
                    <div className="relative w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-gradient-to-br from-deco-gold/30 to-deco-bronze/30 flex items-center justify-center border-2 border-deco-gold">
                      <span className="text-lg font-display font-bold text-deco-gold">
                        {displayChallenge.endActorName.split(' ').map(n => n[0]).join('').slice(0, 2)}
                      </span>
                    </div>
                  )}
                </div>
                
                {/* Name - absolutely centered in full card width */}
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="font-display text-base sm:text-lg text-deco-cream tracking-wide drop-shadow-[0_2px_4px_rgba(0,0,0,0.5)]">
                    {displayChallenge.endActorName}
                  </span>
                </div>
              </div>
            </div>
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
