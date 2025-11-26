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
      {/* Individual connection validation is now shown inline with icons */}
      {/* Game completion result */}
      {gameResult && (
        <Alert
          className={`card-radius shadow-card transition-all duration-300 ${
            gameResult.valid && gameResult.completed
              ? "bg-green-100 border-green-500 text-green-800"
              : gameResult.valid
              ? "bg-green-100 border-green-500 text-green-800"
              : "bg-red-100 border-red-500 text-red-800"
          }`}
        >
          {gameResult.completed ? (
            <div className="space-y-2">
              {/* Congratulations message */}
              <div className="flex justify-center">
                <div className="flex items-center">
                  <Trophy className="w-5 h-5 mr-2" />
                  <div className="font-semibold text-green-800 text-center text-body">
                    Congratulations! You finished in {gameResult.moves || validConnectionsCount} moves!
                  </div>
                </div>
              </div>
              
              {/* Share buttons at bottom center */}
              <div className="flex flex-col sm:flex-row justify-center gap-2 pt-1">
                <Button
                  onClick={handleShare}
                  variant="outline"
                  size="sm"
                  className="border-green-500 text-black hover:bg-gray-100 hover:text-gray-800 btn-hover button-radius transition-all duration-200"
                >
                  <Share className="w-4 h-4 mr-2" />
                  Share Victory
                </Button>
                <Button
                  onClick={handleShareMovies}
                  variant="outline"
                  size="sm"
                  className="border-amber-500 text-black hover:bg-gray-100 hover:text-gray-800 btn-hover button-radius transition-all duration-200"
                >
                  <Film className="w-4 h-4 mr-2" />
                  Share Movies
                </Button>
              </div>
            </div>
          ) : (
            <div className={gameResult.valid ? "flex items-center" : "flex justify-center items-center"}>
              {gameResult.valid ? (
                <>
                  <CheckCircle className="w-4 h-4 mr-3" />
                  <div>
                    <AlertDescription>
                      <div>{gameResult.message}</div>
                    </AlertDescription>
                  </div>
                </>
              ) : (
                <div className="flex items-center">
                  <XCircle className="w-4 h-4 mr-3" />
                  <AlertDescription>
                    <div className="text-red-800 font-medium text-[17px]">Try harder you bum</div>
                  </AlertDescription>
                </div>
              )}
            </div>
          )}
        </Alert>
      )}
    </div>
  );
}
