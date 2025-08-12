import { Button } from "@/components/ui/button";
import { ArrowLeftRight } from "lucide-react";
import { DailyChallenge } from "@shared/schema";

interface ActorSwitcherProps {
  challenge: DailyChallenge;
  isFlipped: boolean;
  onFlip: () => void;
  disabled?: boolean;
}

export default function ActorSwitcher({ challenge, isFlipped, onFlip, disabled = false }: ActorSwitcherProps) {
  const startActor = isFlipped ? challenge.endActorName : challenge.startActorName;
  const endActor = isFlipped ? challenge.startActorName : challenge.endActorName;

  return (
    <div className="bg-white rounded-xl shadow-lg p-4 sm:p-6 mb-6 sm:mb-8 mx-4 sm:mx-0">
      <div className="text-center">
        <h3 className="text-lg font-semibold text-game-primary mb-4">Actor Direction</h3>
        <div className="flex flex-col sm:flex-row items-center justify-center space-y-2 sm:space-y-0 sm:space-x-4 mb-4">
          <div className="bg-gray-100 px-3 py-2 rounded-lg font-medium text-sm text-center w-full sm:w-auto">
            Start: <span className="block sm:inline font-semibold">{startActor}</span>
          </div>
          <ArrowLeftRight className="w-5 h-5 text-gray-400 rotate-90 sm:rotate-0" />
          <div className="bg-gray-100 px-3 py-2 rounded-lg font-medium text-sm text-center w-full sm:w-auto">
            End: <span className="block sm:inline font-semibold">{endActor}</span>
          </div>
        </div>
        <Button
          onClick={onFlip}
          disabled={disabled}
          variant="outline"
          className="border-game-blue text-game-blue hover:bg-game-blue hover:text-white w-full sm:w-auto"
        >
          <ArrowLeftRight className="w-4 h-4 mr-2" />
          Switch Starting Actor
        </Button>
        <p className="text-xs sm:text-sm text-gray-600 mt-3 px-2">
          {isFlipped ? "You're now connecting from " + challenge.endActorName + " to " + challenge.startActorName 
                     : "You're connecting from " + challenge.startActorName + " to " + challenge.endActorName}
        </p>
      </div>
    </div>
  );
}