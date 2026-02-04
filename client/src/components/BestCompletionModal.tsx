import { useQuery } from "@tanstack/react-query";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { User, Trophy } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";

interface BestCompletionModalProps {
    isOpen: boolean;
    onOpenChange: (open: boolean) => void;
    challengeId: string;
}

interface BestUsersResponse {
    moves: number;
    users: {
        id: string;
        username: string;
        firstName: string | null;
        picture: string | null;
    }[];
}

export function BestCompletionModal({
    isOpen,
    onOpenChange,
    challengeId,
}: BestCompletionModalProps) {
    const { data, isLoading } = useQuery<BestUsersResponse>({
        queryKey: ["/api/analytics/best-users", challengeId],
        queryFn: async () => {
            const response = await fetch(`/api/analytics/best-users?challengeId=${challengeId}`);
            if (!response.ok) {
                throw new Error("Failed to fetch best users");
            }
            return response.json();
        },
        enabled: isOpen && !!challengeId,
    });

    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md bg-deco-charcoal/95 border-deco-gold/20 text-deco-cream">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 text-deco-gold">
                        <Trophy className="h-5 w-5" />
                        Best Completion Leaders
                    </DialogTitle>
                </DialogHeader>

                <div className="py-4">
                    {isLoading ? (
                        <div className="flex justify-center p-8">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-deco-gold"></div>
                        </div>
                    ) : data && data.users.length > 0 ? (
                        <div className="space-y-4">
                            <div className="text-center mb-4">
                                <span className="text-2xl font-bold text-game-success">
                                    {data.moves} Moves
                                </span>
                                <p className="text-sm text-deco-cream/60 mt-1">
                                    Achieved by {data.users.length} player{data.users.length !== 1 ? "s" : ""}
                                </p>
                            </div>

                            <ScrollArea className="h-[300px] w-full pr-4">
                                <div className="space-y-3">
                                    {data.users.map((user) => (
                                        <div
                                            key={user.id}
                                            className="flex items-center gap-3 p-3 rounded-lg bg-black/20 border border-white/5"
                                        >
                                            <Avatar className="h-10 w-10 border border-deco-gold/20">
                                                <AvatarImage src={user.picture || undefined} />
                                                <AvatarFallback className="bg-deco-gold/10 text-deco-gold">
                                                    <User className="h-5 w-5" />
                                                </AvatarFallback>
                                            </Avatar>
                                            <div className="flex-1 min-w-0">
                                                <p className="font-medium text-deco-cream truncate">
                                                    {user.firstName || user.username}
                                                </p>
                                                {user.firstName && (
                                                    <p className="text-xs text-deco-cream/50 truncate">
                                                        @{user.username}
                                                    </p>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </ScrollArea>
                        </div>
                    ) : (
                        <div className="text-center py-8 text-deco-cream/60">
                            <p>No completions recorded yet.</p>
                            <p className="text-sm mt-2">Be the first to solve it in the fewest moves!</p>
                        </div>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
}
