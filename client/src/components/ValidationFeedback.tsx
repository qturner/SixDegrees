import { CheckCircle, XCircle, Trophy, Share, Mail, MessageCircle, Copy } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ValidationResult } from "@shared/schema";
import { useState } from "react";

interface ValidationFeedbackProps {
  validationResults: ValidationResult[];
  gameResult: ValidationResult | null;
}

export default function ValidationFeedback({ validationResults, gameResult }: ValidationFeedbackProps) {
  const hasResults = validationResults.length > 0 || gameResult;
  const [showShareModal, setShowShareModal] = useState(false);

  if (!hasResults) {
    return null;
  }

  // Count the number of valid connections (green checkmarks)
  const validConnectionsCount = validationResults.filter(result => result?.valid).length;

  const handleShare = () => {
    setShowShareModal(true);
  };

  const shareText = `I just completed today's 6 Degrees of Separation challenge in ${gameResult?.moves || validConnectionsCount} moves! Can you do better?`;

  const handleShareOption = async (type: 'mail' | 'copy') => {
    if (type === 'mail') {
      const subject = encodeURIComponent('6 Degrees of Separation Challenge');
      const body = encodeURIComponent(shareText);
      window.open(`mailto:?subject=${subject}&body=${body}`);
    } else if (type === 'copy') {
      try {
        if (navigator.clipboard && navigator.clipboard.writeText) {
          await navigator.clipboard.writeText(shareText);
        } else {
          // Fallback: create a temporary textarea for copying
          const textArea = document.createElement('textarea');
          textArea.value = shareText;
          textArea.style.position = 'fixed';
          textArea.style.left = '-9999px';
          document.body.appendChild(textArea);
          textArea.select();
          document.execCommand('copy');
          document.body.removeChild(textArea);
        }
      } catch (error) {
        console.error('Error copying:', error);
      }
    }
    setShowShareModal(false);
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

      {/* Custom Share Modal */}
      <Dialog open={showShareModal} onOpenChange={setShowShareModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Share Victory</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col space-y-4 py-4">
            <Button
              variant="ghost"
              className="flex items-center justify-start space-x-3 h-12"
              onClick={() => handleShareOption('mail')}
            >
              <Mail className="h-5 w-5" />
              <span>Mail</span>
            </Button>
            <Button
              variant="ghost"
              className="flex items-center justify-start space-x-3 h-12"
              onClick={() => handleShareOption('copy')}
            >
              <Copy className="h-5 w-5" />
              <span>Copy to Clipboard</span>
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
