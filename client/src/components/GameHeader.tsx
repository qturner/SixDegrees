import { Calendar, ArrowRight } from "lucide-react";
import { DailyChallenge } from "@shared/schema";

interface GameHeaderProps {
  challenge: DailyChallenge;
  currentMoves: number;
}

export default function GameHeader({ challenge, currentMoves }: GameHeaderProps) {
  const getCurrentDate = () => {
    return new Date().toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric", 
      month: "long",
      day: "numeric"
    });
  };

  const getGameStatus = () => {
    if (currentMoves === 0) return "Ready to Start";
    if (currentMoves >= 6) return "Game Over";
    return "In Progress";
  };

  const getStatusColor = () => {
    const status = getGameStatus();
    if (status === "Ready to Start") return "text-game-blue";
    if (status === "Game Over") return "text-game-error";
    return "text-game-warning";
  };

  return (
    <header className="bg-white shadow-sm border-b border-gray-200">
      <div className="max-w-4xl mx-auto px-4 py-4 sm:py-6">
        <div className="text-center">
          <h1 className="text-2xl sm:text-3xl font-bold text-game-primary mb-2">6 Degrees of Separation</h1>
          <p className="text-gray-600 text-base sm:text-lg">Connect two actors through movies in 6 moves or less</p>
          <div className="mt-3 sm:mt-4 text-sm text-gray-500">
            <Calendar className="inline-block w-4 h-4 mr-2" />
            <span className="hidden sm:inline">Today's Challenge - {getCurrentDate()}</span>
            <span className="sm:hidden">Today's Challenge</span>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-lg p-4 sm:p-6 mb-6 sm:mb-8 max-w-4xl mx-auto -mt-4 mx-4 sm:mx-auto">
        <div className="text-center mb-4 sm:mb-6">
          <h2 className="text-lg sm:text-xl font-semibold text-game-primary mb-4">Today's Challenge</h2>
          <div className="flex flex-col sm:flex-row items-center justify-center space-y-3 sm:space-y-0 sm:space-x-6 mb-4">
            <div className="flex items-center space-x-2 sm:space-x-3 bg-game-blue text-white px-3 sm:px-6 py-2 sm:py-3 rounded-lg font-medium text-sm sm:text-lg w-full sm:w-auto justify-center">
              {challenge.startActorProfilePath ? (
                <img
                  src={`https://image.tmdb.org/t/p/w92${challenge.startActorProfilePath}`}
                  alt={challenge.startActorName}
                  className="w-8 h-8 sm:w-10 sm:h-10 rounded-full object-cover border-2 border-white flex-shrink-0"
                />
              ) : (
                <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-white/20 flex items-center justify-center border-2 border-white flex-shrink-0">
                  <span className="text-xs font-medium text-white">
                    {challenge.startActorName.split(' ').map(n => n[0]).join('').slice(0, 2)}
                  </span>
                </div>
              )}
              <span className="truncate">{challenge.startActorName}</span>
            </div>
            <div className="text-xl sm:text-2xl text-gray-400 rotate-90 sm:rotate-0">
              <ArrowRight className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>
            <div className="flex items-center space-x-2 sm:space-x-3 bg-game-blue text-white px-3 sm:px-6 py-2 sm:py-3 rounded-lg font-medium text-sm sm:text-lg w-full sm:w-auto justify-center">
              {challenge.endActorProfilePath ? (
                <img
                  src={`https://image.tmdb.org/t/p/w92${challenge.endActorProfilePath}`}
                  alt={challenge.endActorName}
                  className="w-8 h-8 sm:w-10 sm:h-10 rounded-full object-cover border-2 border-white flex-shrink-0"
                />
              ) : (
                <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-white/20 flex items-center justify-center border-2 border-white flex-shrink-0">
                  <span className="text-xs font-medium text-white">
                    {challenge.endActorName.split(' ').map(n => n[0]).join('').slice(0, 2)}
                  </span>
                </div>
              )}
              <span className="truncate">{challenge.endActorName}</span>
            </div>
          </div>
          <div className="flex items-center justify-center space-x-4 sm:space-x-6 text-sm">
            <span className={`font-medium ${getStatusColor()}`}>
              Status: {getGameStatus()}
            </span>
            <span className="text-gray-600">
              Moves: {currentMoves}/6
            </span>
          </div>
        </div>
      </div>
    </header>
  );
}
