import { CheckCircle, XCircle, Trophy, Share, Film } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { ValidationResult, Connection } from "@shared/schema";

interface ValidationFeedbackProps {
  validationResults: ValidationResult[];
  gameResult: ValidationResult | null;
  connections?: Connection[];
}

export default function ValidationFeedback({ validationResults, gameResult, connections = [] }: ValidationFeedbackProps) {
  const hasResults = validationResults.length > 0 || gameResult;

  if (!hasResults) {
    return null;
  }

  // Count the number of valid connections (green checkmarks)
  const validConnectionsCount = validationResults.filter(result => result?.valid).length;

  const handleShare = async () => {
    if (gameResult?.completed) {
      const text = `I just completed today's 6 Degrees of Separation challenge in ${gameResult.moves} moves! Can you do better?`;
      const shareData = {
        title: "6 Degrees of Separation Challenge",
        text: text,
        url: window.location.origin,
      };

      try {
        if (navigator.share) {
          await navigator.share(shareData);
        } else if (navigator.clipboard && navigator.clipboard.writeText) {
          await navigator.clipboard.writeText(text);
        } else {
          const textArea = document.createElement('textarea');
          textArea.value = text;
          textArea.style.position = 'fixed';
          textArea.style.left = '-9999px';
          document.body.appendChild(textArea);
          textArea.select();
          document.execCommand('copy');
          document.body.removeChild(textArea);
        }
      } catch (error) {
        console.error('Error sharing:', error);
        try {
          const textArea = document.createElement('textarea');
          textArea.value = text;
          textArea.style.position = 'fixed';
          textArea.style.left = '-9999px';
          document.body.appendChild(textArea);
          textArea.select();
          document.execCommand('copy');
          document.body.removeChild(textArea);
        } catch (fallbackError) {
          console.error('Fallback copy failed:', fallbackError);
        }
      }
    }
  };

  const handleShareMovies = async () => {
    if (gameResult?.completed && connections.length > 0) {
      const movieTitles = connections
        .filter(conn => conn.movieTitle)
        .map(conn => conn.movieTitle);
      
      const movieList = movieTitles.map((title, index) => `${index + 1}. ${title}`).join('\n');
      const text = `My winning path for today's 6 Degrees challenge:\n\n${movieList}\n\nCan you find a shorter path? Play at ${window.location.origin}`;
      
      const shareData = {
        title: "My 6 Degrees Movie Path",
        text: text,
      };

      try {
        if (navigator.share) {
          await navigator.share(shareData);
        } else if (navigator.clipboard && navigator.clipboard.writeText) {
          await navigator.clipboard.writeText(text);
        } else {
          const textArea = document.createElement('textarea');
          textArea.value = text;
          textArea.style.position = 'fixed';
          textArea.style.left = '-9999px';
          document.body.appendChild(textArea);
          textArea.select();
          document.execCommand('copy');
          document.body.removeChild(textArea);
        }
      } catch (error) {
        console.error('Error sharing movies:', error);
        try {
          const textArea = document.createElement('textarea');
          textArea.value = text;
          textArea.style.position = 'fixed';
          textArea.style.left = '-9999px';
          document.body.appendChild(textArea);
          textArea.select();
          document.execCommand('copy');
          document.body.removeChild(textArea);
        } catch (fallbackError) {
          console.error('Fallback copy failed:', fallbackError);
        }
      }
    }
  };

  return (
    <div className="space-y-4 mb-8">
      {/* Game completion result */}
      {gameResult && (
        <div className="group relative">
          {/* Glow effect behind card */}
          <div className={`absolute -inset-1 rounded blur-md transition-opacity duration-300 ${
            gameResult.valid && gameResult.completed
              ? "bg-gradient-to-br from-deco-gold/40 via-game-success/30 to-transparent opacity-70"
              : gameResult.valid
              ? "bg-gradient-to-br from-game-success/30 via-deco-gold/20 to-transparent opacity-60"
              : "bg-gradient-to-br from-game-error/30 via-deco-bronze/20 to-transparent opacity-60"
          }`} />
          
          {/* Main card */}
          <div className={`relative bg-gradient-to-br from-deco-charcoal via-deco-onyx to-deco-black border-2 p-6 shadow-[0_8px_32px_rgba(0,0,0,0.4)] transition-all duration-300 ${
            gameResult.valid && gameResult.completed
              ? "border-deco-gold"
              : gameResult.valid
              ? "border-game-success/60"
              : "border-game-error/60"
          }`}>
            {/* Corner accents */}
            <div className={`absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 ${gameResult.valid ? 'border-deco-gold' : 'border-game-error/60'}`} />
            <div className={`absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 ${gameResult.valid ? 'border-deco-gold' : 'border-game-error/60'}`} />
            <div className={`absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 ${gameResult.valid ? 'border-deco-gold' : 'border-game-error/60'}`} />
            <div className={`absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 ${gameResult.valid ? 'border-deco-gold' : 'border-game-error/60'}`} />
            
            {gameResult.completed ? (
              <div className="space-y-4">
                {/* Trophy icon with glow */}
                <div className="flex justify-center">
                  <div className="relative">
                    <div className="absolute -inset-2 bg-deco-gold/30 rounded-full blur-md" />
                    <Trophy className="relative w-12 h-12 text-deco-gold drop-shadow-[0_0_8px_rgba(196,151,49,0.6)]" />
                  </div>
                </div>
                
                {/* Congratulations message */}
                <div className="text-center">
                  <h3 className="font-display text-2xl text-deco-gold mb-2 tracking-wide" style={{ textShadow: '0 0 20px rgba(196,151,49,0.4)' }}>
                    Congratulations!
                  </h3>
                  <p className="text-deco-cream text-lg">
                    You finished in <span className="text-deco-gold font-bold">{gameResult.moves || validConnectionsCount}</span> moves!
                  </p>
                </div>
                
                {/* Share buttons */}
                <div className="flex flex-col sm:flex-row justify-center gap-3 pt-2">
                  <Button
                    onClick={handleShare}
                    size="sm"
                    className="bg-transparent border-2 border-deco-gold text-deco-gold hover:bg-deco-gold hover:text-deco-black uppercase tracking-wider transition-all duration-200"
                  >
                    <Share className="w-4 h-4 mr-2" />
                    Share Victory
                  </Button>
                  <Button
                    onClick={handleShareMovies}
                    size="sm"
                    className="bg-transparent border-2 border-deco-bronze text-deco-cream hover:bg-deco-bronze hover:text-deco-black uppercase tracking-wider transition-all duration-200"
                  >
                    <Film className="w-4 h-4 mr-2" />
                    Share Movies
                  </Button>
                </div>
              </div>
            ) : (
              <div className="flex justify-center items-center py-2">
                {gameResult.valid ? (
                  <div className="flex items-center text-game-success">
                    <CheckCircle className="w-5 h-5 mr-3" />
                    <span className="text-lg">{gameResult.message}</span>
                  </div>
                ) : (
                  <div className="flex items-center text-game-error">
                    <XCircle className="w-5 h-5 mr-3" />
                    <span className="text-lg font-medium">Try harder you bum</span>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
