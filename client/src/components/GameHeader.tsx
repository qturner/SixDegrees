import { Calendar, ArrowRight, ArrowLeftRight, HelpCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DailyChallenge, ValidationResult } from "@shared/schema";

interface GameHeaderProps {
  challenge: DailyChallenge;
  currentMoves: number;
  isFlipped?: boolean;
  onFlip?: () => void;
  canFlip?: boolean;
  gameResult?: ValidationResult | null;
}

export default function GameHeader({ challenge, currentMoves, isFlipped = false, onFlip, canFlip = true, gameResult }: GameHeaderProps) {
  // Get the effective actors to display based on flip state
  const displayChallenge = isFlipped ? {
    ...challenge,
    startActorName: challenge.endActorName,
    startActorProfilePath: challenge.endActorProfilePath,
    endActorName: challenge.startActorName,
    endActorProfilePath: challenge.startActorProfilePath,
  } : challenge;
  const getCurrentDate = () => {
    return new Date().toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric", 
      month: "long",
      day: "numeric"
    });
  };

  const getGameStatus = () => {
    // Check if game has been successfully completed
    if (gameResult?.valid && gameResult?.completed) return "Complete";
    
    if (currentMoves === 0) return "Ready to Start";
    if (currentMoves >= 6) return "Game Over";
    return "In Progress";
  };

  const getStatusColor = () => {
    const status = getGameStatus();
    if (status === "Ready to Start") return "text-game-blue";
    if (status === "Complete") return "text-game-success";
    if (status === "Game Over") return "text-game-error";
    return "text-game-warning";
  };

  const scrollToHowToPlay = () => {
    const element = document.getElementById('how-to-play');
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  return (
    <header className="bg-game-surface shadow-sm border-b border-game-accent text-game-text" role="banner">
      <div className="max-w-4xl mx-auto px-4 py-4 sm:py-6">
        <div className="text-center">
          <div className="flex flex-col items-center justify-center mb-3">
            <div className="flex items-center justify-center mb-2">
              <svg width="56" height="44" viewBox="0 0 56 44" xmlns="http://www.w3.org/2000/svg" className="mr-3" style={{ shapeRendering: 'geometricPrecision' }}>
                <defs>
                  {/* 3D reel gradients - higher contrast black to light gray */}
                  <linearGradient id="reelFace" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#808080"/>
                    <stop offset="25%" stopColor="#505050"/>
                    <stop offset="75%" stopColor="#252525"/>
                    <stop offset="100%" stopColor="#0a0a0a"/>
                  </linearGradient>
                  <linearGradient id="reelEdge" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#1a1a1a"/>
                    <stop offset="50%" stopColor="#606060"/>
                    <stop offset="100%" stopColor="#1a1a1a"/>
                  </linearGradient>
                  <linearGradient id="filmStrip" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#404040"/>
                    <stop offset="50%" stopColor="#1a1a1a"/>
                    <stop offset="100%" stopColor="#000000"/>
                  </linearGradient>
                  <linearGradient id="hubGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#909090"/>
                    <stop offset="50%" stopColor="#505050"/>
                    <stop offset="100%" stopColor="#1a1a1a"/>
                  </linearGradient>
                  <filter id="reelShadow" x="-20%" y="-20%" width="140%" height="140%">
                    <feDropShadow dx="2" dy="2" stdDeviation="2" floodOpacity="0.5"/>
                  </filter>
                </defs>
                
                {/* Film strip unrolling - curved 3D effect */}
                <path 
                  d="M32 22 Q40 24 46 30 Q52 36 56 42" 
                  fill="none" 
                  stroke="url(#filmStrip)" 
                  strokeWidth="8"
                  strokeLinecap="round"
                />
                {/* Film strip highlight edge */}
                <path 
                  d="M32 20 Q40 22 46 28 Q52 34 56 40" 
                  fill="none" 
                  stroke="#3a3a3a" 
                  strokeWidth="1"
                  strokeLinecap="round"
                />
                {/* Sprocket holes on film strip */}
                <circle cx="38" cy="25" r="1" fill="#c0c0c0"/>
                <circle cx="44" cy="30" r="1" fill="#c0c0c0"/>
                <circle cx="50" cy="36" r="1" fill="#c0c0c0"/>
                
                {/* 3D reel edge (side thickness) */}
                <ellipse cx="20" cy="24" rx="18" ry="4" fill="url(#reelEdge)"/>
                
                {/* Main reel face */}
                <circle cx="20" cy="22" r="18" fill="url(#reelFace)" filter="url(#reelShadow)"/>
                
                {/* Outer rim highlight - higher contrast */}
                <circle cx="20" cy="22" r="17" fill="none" stroke="#a0a0a0" strokeWidth="1.5"/>
                <circle cx="20" cy="22" r="15.5" fill="none" stroke="#404040" strokeWidth="0.5"/>
                
                {/* 6 large holes arranged in circle - with 3D depth (matches "Six Degrees") */}
                {/* Top hole */}
                <circle cx="20" cy="9" r="3.5" fill="#000000"/>
                <ellipse cx="20" cy="9.5" rx="2.5" ry="2" fill="#d0d0d0" opacity="0.2"/>
                
                {/* Top right hole */}
                <circle cx="29" cy="14" r="3.5" fill="#000000"/>
                <ellipse cx="29" cy="14.5" rx="2.5" ry="2" fill="#d0d0d0" opacity="0.2"/>
                
                {/* Bottom right hole */}
                <circle cx="29" cy="26" r="3.5" fill="#000000"/>
                <ellipse cx="29" cy="26.5" rx="2.5" ry="2" fill="#d0d0d0" opacity="0.2"/>
                
                {/* Bottom hole */}
                <circle cx="20" cy="31" r="3.5" fill="#000000"/>
                <ellipse cx="20" cy="31.5" rx="2.5" ry="2" fill="#d0d0d0" opacity="0.2"/>
                
                {/* Bottom left hole */}
                <circle cx="11" cy="26" r="3.5" fill="#000000"/>
                <ellipse cx="11" cy="26.5" rx="2.5" ry="2" fill="#d0d0d0" opacity="0.2"/>
                
                {/* Top left hole */}
                <circle cx="11" cy="14" r="3.5" fill="#000000"/>
                <ellipse cx="11" cy="14.5" rx="2.5" ry="2" fill="#d0d0d0" opacity="0.2"/>
                
                {/* Center hub - 3D effect with higher contrast */}
                <circle cx="20" cy="20" r="6" fill="#000000"/>
                <circle cx="20" cy="20" r="5" fill="url(#hubGrad)"/>
                <circle cx="20" cy="20" r="3" fill="#404040"/>
                <circle cx="20" cy="20" r="2" fill="#000000"/>
                {/* Hub highlight */}
                <circle cx="18.5" cy="18.5" r="1.5" fill="#c0c0c0" opacity="0.5"/>
              </svg>
              <h1 className="text-heading-lg text-game-primary whitespace-nowrap">Six Degrees of Separation</h1>
            </div>
          </div>
          <p className="text-game-accent text-body-lg">Connect two actors through movies in 6 moves or less</p>
          <Button
            onClick={scrollToHowToPlay}
            variant="ghost"
            size="sm"
            className="mt-2 text-game-accent hover:text-game-primary hover:bg-game-background/50 btn-hover button-radius transition-all duration-200"
            data-testid="button-how-to-play"
          >
            <HelpCircle className="w-4 h-4 mr-1" />
            How to Play
          </Button>
        </div>
      </div>
    </header>
  );
}
