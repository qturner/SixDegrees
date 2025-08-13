import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";

interface AboutModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AboutModal({ open, onOpenChange }: AboutModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md mx-auto my-auto bg-white dark:bg-gray-800 border-2 border-game-border rounded-lg fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
        <DialogHeader>
          <DialogTitle className="text-game-primary text-xl font-bold text-center">
            About Six Degrees
          </DialogTitle>
          <DialogDescription className="sr-only">
            Learn about the origins of the Six Degrees of Separation game
          </DialogDescription>
        </DialogHeader>
        <div className="p-4 text-gray-700 dark:text-gray-300 leading-relaxed">
          <p>
            Six Degrees of Separation was a game I grew up playing with my family. As a family without cable TV and a heavy reliance on movie rentals, our world revolved around Hollywood. From Airplane to the Lord of the Rings, we watched it all. The game became a way for us to pass time on road trips or fill lulls during the holidays. While it's not for everyone, I hope it gives a few users an excuse to brush up on the classics or catch up on the latest releases.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}