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
    <div className="bg-white rounded-xl shadow-lg p-6 mb-8">
      <div className="text-center">
        <h3 className="text-lg font-semibold text-game-primary mb-4">Actor Direction</h3>
        <div className="flex items-center justify-center space-x-4 mb-4">
          <div className="bg-gray-100 px-4 py-2 rounded-lg font-medium">
            Start: {startActor}
          </div>
          <ArrowLeftRight className="w-5 h-5 text-gray-400" />
          <div className="bg-gray-100 px-4 py-2 rounded-lg font-medium">
            End: {endActor}
          </div>
        </div>
        <Button
          onClick={onFlip}
          disabled={disabled}
          variant="outline"
          className="border-game-blue text-game-blue hover:bg-game-blue hover:text-white"
        >
          <ArrowLeftRight className="w-4 h-4 mr-2" />
          Switch Starting Actor
        </Button>
        <p className="text-sm text-gray-600 mt-3">
          {isFlipped ? "You're now connecting from " + challenge.endActorName + " to " + challenge.startActorName 
                     : "You're connecting from " + challenge.startActorName + " to " + challenge.endActorName}
        </p>
      </div>
    </div>
  );
}