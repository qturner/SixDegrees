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
      <div className="max-w-4xl mx-auto px-4 py-6">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-game-primary mb-2">6 Degrees of Separation</h1>
          <p className="text-gray-600 text-lg">Connect two actors through movies in 6 moves or less</p>
          <div className="mt-4 text-sm text-gray-500">
            <Calendar className="inline-block w-4 h-4 mr-2" />
            <span>Today's Challenge - {getCurrentDate()}</span>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-lg p-6 mb-8 max-w-4xl mx-auto -mt-4">
        <div className="text-center mb-6">
          <h2 className="text-xl font-semibold text-game-primary mb-4">Today's Challenge</h2>
          <div className="flex items-center justify-center space-x-4 mb-4">
            <div className="bg-game-blue text-white px-6 py-3 rounded-lg font-medium text-lg">
              {challenge.startActorName}
            </div>
            <div className="text-2xl text-gray-400">
              <ArrowRight className="w-6 h-6" />
            </div>
            <div className="bg-game-blue text-white px-6 py-3 rounded-lg font-medium text-lg">
              {challenge.endActorName}
            </div>
          </div>
          <div className="text-sm text-gray-600">
            Connect these actors using movies they've appeared in
          </div>
        </div>

        <div className="flex items-center justify-center space-x-4 mb-6">
          <div className="text-sm text-gray-600">
            <span className="font-medium">Moves:</span> 
            <span className="font-bold text-game-blue ml-1">{currentMoves}</span> / 6
          </div>
          <div className="h-4 w-px bg-gray-300"></div>
          <div className="text-sm text-gray-600">
            <span className="font-medium">Status:</span> 
            <span className={`font-medium ml-1 ${getStatusColor()}`}>{getGameStatus()}</span>
          </div>
        </div>
      </div>
    </header>
  );
}
