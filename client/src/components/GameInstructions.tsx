import { HelpCircle, Circle, Trophy } from "lucide-react";

export default function GameInstructions() {
  return (
    <div className="bg-white rounded-xl shadow-lg p-6 mb-8">
      <h3 className="text-xl font-semibold text-game-primary mb-4">
        <HelpCircle className="inline-block w-5 h-5 mr-2" />
        How to Play
      </h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <h4 className="font-semibold text-game-primary mb-3">Game Rules</h4>
          <ul className="space-y-2 text-gray-600">
            <li className="flex items-start">
              <Circle className="w-2 h-2 mt-2 mr-3 text-game-blue fill-current" />
              Connect two actors using a chain of movies and co-stars
            </li>
            <li className="flex items-start">
              <Circle className="w-2 h-2 mt-2 mr-3 text-game-blue fill-current" />
              You have a maximum of 6 connections to link them
            </li>
            <li className="flex items-start">
              <Circle className="w-2 h-2 mt-2 mr-3 text-game-blue fill-current" />
              Each actor must appear in the movie you specify
            </li>
            <li className="flex items-start">
              <Circle className="w-2 h-2 mt-2 mr-3 text-game-blue fill-current" />
              Adjacent actors must have appeared together in the same film
            </li>
          </ul>
        </div>
        <div>
          <h4 className="font-semibold text-game-primary mb-3">Example Chain</h4>
          <div className="space-y-2 text-sm">
            <div className="bg-gray-50 p-3 rounded-lg">
              <span className="font-medium text-game-blue">Jack Black</span> in{" "}
              <span className="font-medium">Tropic Thunder</span> with{" "}
              <span className="font-medium text-game-blue">Ben Stiller</span>
            </div>
            <div className="bg-gray-50 p-3 rounded-lg">
              <span className="font-medium text-game-blue">Ben Stiller</span> in{" "}
              <span className="font-medium">Meet the Parents</span> with{" "}
              <span className="font-medium text-game-blue">Robert De Niro</span>
            </div>
            <div className="bg-gray-50 p-3 rounded-lg">
              <span className="font-medium text-game-blue">Robert De Niro</span> in{" "}
              <span className="font-medium">Heat</span> with{" "}
              <span className="font-medium text-game-blue">Al Pacino</span>
            </div>
            <div className="text-center mt-3">
              <span className="text-game-success font-medium">
                <Trophy className="inline-block w-4 h-4 mr-1" />
                Connection made in 3 moves!
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
