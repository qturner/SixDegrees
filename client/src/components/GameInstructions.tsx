import { HelpCircle, Circle, Trophy } from "lucide-react";

export default function GameInstructions() {
  return (
    <div className="bg-game-surface border border-game-accent card-radius shadow-card hover:shadow-card-hover transition-all duration-300 spacing-lg mb-8">
      <h3 className="text-heading-md text-game-primary mb-4">
        <HelpCircle className="inline-block w-5 h-5 mr-2" />
        How to Play
      </h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <h4 className="text-heading-sm text-game-primary mb-3">Game Rules</h4>
          <ul className="space-y-2 text-game-text">
            <li className="flex items-start">
              <span className="w-5 h-5 rounded-full bg-game-blue text-white text-sm flex items-center justify-center mr-3 mt-0.5 flex-shrink-0">1</span>
              Connect two actors through movies in six moves or less
            </li>
            <li className="flex items-start">
              <span className="w-5 h-5 rounded-full bg-game-blue text-white text-sm flex items-center justify-center mr-3 mt-0.5 flex-shrink-0">2</span>
              Use your daily hints if you're stuck
            </li>
            <li className="flex items-start">
              <span className="w-5 h-5 rounded-full bg-game-blue text-white text-sm flex items-center justify-center mr-3 mt-0.5 flex-shrink-0">3</span>
              Press "Validate" once completed to verify your results!
            </li>
          </ul>
        </div>
        <div>
          <h4 className="text-heading-sm text-game-primary mb-3">Example Chain</h4>
          <div className="space-y-2 text-body-sm">
            <div className="bg-game-background border border-game-accent spacing-sm input-radius transition-all duration-200 hover:bg-game-primary hover:text-game-background">
              <span className="font-medium text-game-primary">Jack Black</span> in{" "}
              <span className="font-medium text-game-text">Tropic Thunder</span> with{" "}
              <span className="font-medium text-game-primary">Ben Stiller</span>
            </div>
            <div className="bg-game-background border border-game-accent spacing-sm input-radius transition-all duration-200 hover:bg-game-primary hover:text-game-background">
              <span className="font-medium text-game-primary">Ben Stiller</span> in{" "}
              <span className="font-medium text-game-text">Meet the Parents</span> with{" "}
              <span className="font-medium text-game-primary">Robert De Niro</span>
            </div>
            <div className="bg-game-background border border-game-accent spacing-sm input-radius transition-all duration-200 hover:bg-game-primary hover:text-game-background">
              <span className="font-medium text-game-primary">Robert De Niro</span> in{" "}
              <span className="font-medium text-game-text">Heat</span> with{" "}
              <span className="font-medium text-game-primary">Al Pacino</span>
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
