import { CheckCircle, XCircle, Trophy, Share, Film, Minimize2 } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { ValidationResult, Connection } from "@shared/schema";
import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface ValidationFeedbackProps {
  validationResults: ValidationResult[];
  gameResult: ValidationResult | null;
  connections?: Connection[];
}

export default function ValidationFeedback({ validationResults, gameResult, connections = [] }: ValidationFeedbackProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isModalDismissed, setIsModalDismissed] = useState(false);

  // When game is completed, show the modal if not already dismissed
  useEffect(() => {
    if (gameResult?.completed && !isModalDismissed) {
      setIsModalOpen(true);
    } else {
      setIsModalOpen(false);
    }
  }, [gameResult?.completed, isModalDismissed]);

  // Reset dismissed state if game result is cleared (e.g. on reset)
  useEffect(() => {
    if (!gameResult) {
      setIsModalDismissed(false);
    }
  }, [gameResult]);

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

  const renderCongratulationsCard = (isModal: boolean = false) => (
    <div className={`group relative ${isModal ? "w-full max-w-4xl mx-auto" : ""}`}>
      {/* Super Cosmic Glow Layers */}
      {gameResult?.completed && (
        <>
          <div className="absolute -inset-8 bg-gradient-to-tr from-cyan-500/30 via-fuchsia-500/30 to-amber-500/30 rounded-xl blur-3xl animate-pulse duration-[4000ms] opacity-60" />
          <div className="absolute -inset-4 bg-gradient-to-br from-indigo-500/40 via-purple-500/40 to-pink-500/40 rounded-xl blur-2xl opacity-70" />
        </>
      )}

      {/* Main deco-card */}
      <div className={`relative deco-card overflow-hidden backdrop-blur-md transition-all duration-500 pb-12 ${gameResult?.completed
        ? "p-8 sm:p-12 border-2 border-deco-gold/50 shadow-[0_0_50px_rgba(196,151,49,0.3)] bg-deco-black/80"
        : "p-6 border border-white/10 bg-deco-black/40"
        }`}>
        {/* Subtle background effects */}
        <div className={`absolute inset-0 bg-gradient-to-br pointer-events-none opacity-20 ${gameResult?.completed
          ? "from-indigo-900 via-transparent to-amber-900"
          : "from-indigo-900/40 via-transparent to-amber-900/40"
          }`} />
        <div className="absolute inset-0 art-deco-bg opacity-10 pointer-events-none" />

        {/* Minimize Button (Only in Modal) */}
        {isModal && (
          <button
            onClick={() => setIsModalDismissed(true)}
            className="absolute top-4 right-4 text-deco-gold/40 hover:text-deco-gold transition-colors z-50 p-2"
            title="Minimize to bottom"
          >
            <Minimize2 className="w-6 h-6" />
          </button>
        )}

        {gameResult?.completed ? (
          <div className="relative z-10 space-y-6">
            {/* Trophy icon with supercharged glow */}
            <div className="flex justify-center">
              <div className="relative group/trophy">
                <div className="absolute -inset-6 bg-deco-gold/40 rounded-full blur-3xl animate-pulse" />
                <div className="absolute -inset-2 bg-gradient-to-r from-cyan-400 via-deco-gold to-fuchsia-400 rounded-full blur opacity-50 transition-opacity duration-500" />
                <Trophy className="relative w-16 h-16 text-deco-gold drop-shadow-[0_0_15px_rgba(196,151,49,0.8)]" />
              </div>
            </div>

            {/* Congratulations message */}
            <div className="text-center space-y-2">
              <h3 className="font-display text-4xl sm:text-5xl text-deco-gold tracking-tight" style={{ textShadow: '0 0 30px rgba(196,151,49,0.6)' }}>
                Congratulations!
              </h3>
              <p className="text-deco-cream text-xl font-light tracking-wide">
                You bridged the gap in <span className="text-deco-gold font-bold">{gameResult.moves || validConnectionsCount}</span> moves
              </p>
            </div>

            {/* Share buttons */}
            <div className="flex flex-col sm:flex-row justify-center gap-4 pt-4">
              <Button
                onClick={handleShare}
                className="h-12 px-8 bg-deco-gold text-deco-charcoal hover:bg-white hover:text-black font-bold uppercase tracking-widest transition-all duration-300 shadow-[0_0_20px_rgba(196,151,49,0.4)]"
              >
                <Share className="w-5 h-5 mr-3" />
                Share Victory
              </Button>
              <Button
                onClick={handleShareMovies}
                variant="outline"
                className="h-12 px-8 border-2 border-deco-gold/30 text-deco-gold hover:border-deco-gold hover:bg-deco-gold/10 font-bold uppercase tracking-widest transition-all duration-300"
              >
                <Film className="w-5 h-5 mr-3" />
                Share Path
              </Button>
            </div>
          </div>
        ) : (
          <div className="relative z-10 flex justify-center items-center">
            {gameResult?.valid ? (
              <div className="flex items-center text-game-success">
                <CheckCircle className="w-5 h-5 mr-3" />
                <span className="text-lg font-medium tracking-wide">{gameResult.message}</span>
              </div>
            ) : (
              <div className="flex items-center text-game-error">
                <XCircle className="w-5 h-5 mr-3" />
                <span className="text-lg font-medium tracking-wide">Keep exploring the connections</span>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div className="space-y-4 mb-8">
      {/* 1. Modal State (First appearance) */}
      <Dialog open={isModalOpen} onOpenChange={(open) => {
        if (!open) setIsModalDismissed(true);
      }}>
        <DialogContent className="max-w-4xl p-0 bg-transparent border-none shadow-none [&>button]:hidden">
          <DialogTitle className="sr-only">Challenge Completed</DialogTitle>
          {renderCongratulationsCard(true)}
        </DialogContent>
      </Dialog>

      {/* 2. Inline State (Standard status message OR minimized congratulations) */}
      {gameResult && (
        <div className="group relative">
          {/* Minimized / Standard Result card */}
          {(!gameResult.completed || isModalDismissed) && (
            <>
              {/* Glow effect for standard results */}
              {!gameResult.completed && (
                <div className={`absolute -inset-1 rounded blur-md transition-opacity duration-300 ${gameResult.valid
                  ? "bg-gradient-to-br from-game-success/30 via-deco-gold/20 to-transparent opacity-60"
                  : "bg-gradient-to-br from-game-error/30 via-deco-bronze/20 to-transparent opacity-60"
                  }`} />
              )}
              {renderCongratulationsCard(false)}
            </>
          )}
        </div>
      )}
    </div>
  );
}
