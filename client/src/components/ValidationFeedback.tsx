import { CheckCircle, XCircle, Trophy, Share } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { ValidationResult } from "@shared/schema";

interface ValidationFeedbackProps {
  validationResults: ValidationResult[];
  gameResult: ValidationResult | null;
}

export default function ValidationFeedback({ validationResults, gameResult }: ValidationFeedbackProps) {
  const hasResults = validationResults.length > 0 || gameResult;

  if (!hasResults) {
    return null;
  }

  // Count the number of valid connections (green checkmarks)
  const validConnectionsCount = validationResults.filter(result => result?.valid).length;

  const handleShare = async () => {
    if (gameResult?.completed) {
      const text = `I just completed today's 6 Degrees of Separation challenge in ${gameResult.moves} moves! Can you do better?`;

      try {
        // Try clipboard first since it's cleaner
        if (navigator.clipboard && navigator.clipboard.writeText) {
          await navigator.clipboard.writeText(text);
        } else {
          // Fallback: create a temporary textarea for copying
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
        // Final fallback to manual copy
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
          className={`${
            gameResult.valid && gameResult.completed
              ? "bg-game-success bg-opacity-10 border-game-success text-game-success"
              : gameResult.valid
              ? "bg-blue-50 border-game-blue text-game-blue"
              : "bg-game-error bg-opacity-10 border-game-error text-game-error"
          }`}
        >
          {gameResult.completed ? (
            <div className="space-y-2">
              {/* Congratulations message */}
              <div className="flex justify-center">
                <div className="flex items-center">
                  <Trophy className="w-5 h-5 mr-2" />
                  <div className="font-semibold text-white text-center text-[15px]">
                    Congratulations! You finished in {gameResult.moves || validConnectionsCount} moves!
                  </div>
                </div>
              </div>
              
              {/* Share button at bottom center */}
              <div className="flex justify-center pt-1">
                <Button
                  onClick={handleShare}
                  variant="outline"
                  size="sm"
                  className="border-game-success text-game-success hover:bg-gray-100 hover:text-gray-800"
                >
                  <Share className="w-4 h-4 mr-2" />
                  Share Victory
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex items-center">
              {gameResult.valid ? (
                <CheckCircle className="w-4 h-4 mr-3" />
              ) : (
                <XCircle className="w-4 h-4 mr-3" />
              )}
              <div>
                <AlertDescription>
                  <div>{gameResult.message}</div>
                </AlertDescription>
              </div>
            </div>
          )}
        </Alert>
      )}
    </div>
  );
}
