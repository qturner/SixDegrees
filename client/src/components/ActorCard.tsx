import { useState } from "react";

interface ActorCardProps {
    name: string;
    profilePath?: string | null;
    variant?: 'cyan' | 'amber' | 'gold' | 'neutral';
    size?: 'sm' | 'md' | 'lg' | 'xl';
    onClick?: () => void;
    className?: string;
    showName?: boolean;
    children?: React.ReactNode; // For hint buttons or other actions
}

export default function ActorCard({
    name,
    profilePath,
    variant = 'gold',
    size = 'md',
    onClick,
    className = '',
    showName = true,
    children
}: ActorCardProps) {
    const [isZoomed, setIsZoomed] = useState(false);

    // Size mappings
    const sizeClasses = {
        sm: "w-20 h-20",
        md: "w-32 h-32 sm:w-40 sm:h-40",
        lg: "w-40 h-40 sm:w-48 sm:h-48",
        xl: "w-48 h-48 sm:w-64 sm:h-64"
    };

    const imageSizeClasses = {
        sm: "w-20 h-20",
        md: "w-32 h-32 sm:w-40 sm:h-40",
        lg: "w-40 h-40 sm:w-48 sm:h-48",
        xl: "w-48 h-48 sm:w-64 sm:h-64"
    };

    // Color mappings
    const colorClasses = {
        cyan: {
            glow: "bg-cyan-500/30 group-hover:bg-cyan-400/50",
            ring: "from-cyan-300 to-cyan-600",
            shadow: "shadow-[0_0_20px_rgba(34,211,238,0.4)]",
            text: "text-cyan-400"
        },
        amber: {
            glow: "bg-amber-500/30 group-hover:bg-amber-400/50",
            ring: "from-amber-300 to-amber-600",
            shadow: "shadow-[0_0_20px_rgba(251,191,36,0.4)]",
            text: "text-amber-400"
        },
        gold: {
            glow: "bg-deco-gold/30 group-hover:bg-deco-gold/50",
            ring: "from-deco-gold to-deco-bronze",
            shadow: "shadow-[0_0_20px_rgba(196,151,49,0.4)]",
            text: "text-deco-gold"
        },
        neutral: {
            glow: "bg-gray-500/30 group-hover:bg-gray-400/50",
            ring: "from-gray-300 to-gray-600",
            shadow: "shadow-[0_0_20px_rgba(156,163,175,0.4)]",
            text: "text-gray-400"
        }
    };

    const colors = colorClasses[variant];

    const handleImageClick = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (onClick) {
            onClick();
        } else if (profilePath) {
            setIsZoomed(true);
        }
    };

    return (
        <>
            <div className={`flex flex-col items-center group ${className}`}>
                <div className="relative mb-3">
                    {/* Glow Effect */}
                    <div className={`absolute -inset-2 rounded-full blur-md transition-all duration-500 opacity-60 ${colors.glow}`} />

                    {/* Image Container with Ring */}
                    <div className={`relative rounded-full p-1 bg-gradient-to-b ${colors.ring} ${colors.shadow} ${sizeClasses[size]}`}>
                        <div className="w-full h-full rounded-full border-4 border-black overflow-hidden bg-black relative">
                            {profilePath ? (
                                <img
                                    src={profilePath.startsWith('http')
                                        ? profilePath
                                        : `https://image.tmdb.org/t/p/w185${profilePath}`}
                                    alt={name}
                                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110 cursor-pointer"
                                    onClick={handleImageClick}
                                />
                            ) : (
                                <div className={`w-full h-full flex items-center justify-center bg-zinc-900 font-bold text-2xl ${colors.text}`}>
                                    {name.charAt(0)}
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Name */}
                {showName && (
                    <h3 className="text-xl sm:text-2xl font-display font-bold text-white tracking-wide mb-2 text-center drop-shadow-md">
                        {name}
                    </h3>
                )}

                {/* Optional children (e.g. buttons) */}
                {children}
            </div>

            {/* Zoom Modal */}
            {isZoomed && profilePath && (
                <div
                    className="fixed inset-0 z-[100] flex items-center justify-center bg-black/95 cursor-pointer backdrop-blur-md"
                    onClick={() => setIsZoomed(false)}
                >
                    <div className="flex flex-col items-center animate-in fade-in zoom-in duration-300" onClick={(e) => e.stopPropagation()}>
                        <img
                            src={profilePath.startsWith('http')
                                ? profilePath
                                : `https://image.tmdb.org/t/p/w500${profilePath}`}
                            alt={name}
                            className="w-72 h-72 sm:w-96 sm:h-96 rounded-full object-cover border-4 border-deco-gold shadow-[0_0_50px_rgba(196,151,49,0.3)]"
                        />
                        <p className="mt-6 font-display text-white text-3xl tracking-wide drop-shadow-lg">{name}</p>
                    </div>
                </div>
            )}
        </>
    );
}
