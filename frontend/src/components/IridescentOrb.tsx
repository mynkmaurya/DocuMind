import React from "react";

interface IridescentOrbProps {
  size?: "sm" | "md" | "lg";
  className?: string;
  isStreaming?: boolean;
  onClick?: () => void;
}

export const IridescentOrb: React.FC<IridescentOrbProps> = ({
  size = "md",
  className = "",
  isStreaming = false,
  onClick,
}) => {
  const sizeClasses = {
    sm: "w-20 h-20 sm:w-24 sm:h-24",
    md: "w-36 h-36 sm:w-44 sm:h-44 md:w-52 md:h-52",
    lg: "w-48 h-48 sm:w-56 sm:h-56 md:w-64 md:h-64",
  }[size];

  return (
    <div
      onClick={onClick}
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      aria-label="Iridescent AI Neural Orb"
      className={`relative flex items-center justify-center select-none cursor-pointer group transition-transform duration-700 ease-out hover:scale-105 active:scale-95 transform-gpu ${sizeClasses} ${className}`}
    >
      {/* Outer ambient atmospheric glow halo (Deep Teal + Violet) */}
      <div
        className={`absolute inset-0 rounded-full blur-3xl opacity-75 transition-all duration-1000 pointer-events-none group-hover:scale-120 group-hover:opacity-95 ${
          isStreaming ? "scale-130 opacity-100 blur-3xl" : "scale-100"
        }`}
        style={{
          background:
            "radial-gradient(circle, rgba(56, 189, 248, 0.45) 0%, rgba(139, 92, 246, 0.35) 45%, rgba(245, 158, 11, 0.25) 70%, transparent 85%)",
        }}
      />

      {/* Outer recessed cavity / dark bezel ring matching the mockup */}
      <div className="relative w-full h-full rounded-full p-2 bg-gradient-to-b from-white/10 via-slate-900/80 to-black/90 shadow-[0_20px_50px_rgba(0,0,0,0.9),inset_0_2px_4px_rgba(255,255,255,0.15)]">
        {/* Main 3D spherical body with fluid iridescent neon ribbons */}
        <div className="relative w-full h-full rounded-full overflow-hidden shadow-[inset_0_-20px_35px_rgba(0,0,0,0.95),inset_0_4px_16px_rgba(255,255,255,0.4)] animate-orb-float border border-white/20">
          {/* Deep midnight indigo base */}
          <div
            className="absolute inset-0"
            style={{
              background:
                "radial-gradient(circle at 45% 35%, #0f172a 0%, #090d16 65%, #020408 100%)",
            }}
          />

          {/* Layer 1: Swirling Electric Cyan & Aqua ribbon */}
          <div
            className="absolute -inset-1/2 rounded-full opacity-85 mix-blend-screen filter blur-md animate-orb-swirl"
            style={{
              background:
                "conic-gradient(from 0deg at 50% 50%, #00f5d4 0deg, #0ea5e9 60deg, transparent 120deg, #38bdf8 180deg, #06b6d4 250deg, transparent 320deg, #00f5d4 360deg)",
            }}
          />

          {/* Layer 2: Swirling Vivid Magenta, Violet & Amber silk ribbon (Reverse swirl) */}
          <div
            className="absolute -inset-1/3 rounded-full opacity-80 mix-blend-color-dodge filter blur-md animate-orb-swirl [animation-direction:reverse] [animation-duration:15s]"
            style={{
              background:
                "conic-gradient(from 120deg at 50% 50%, #f59e0b 0deg, #ec4899 70deg, #8b5cf6 140deg, transparent 200deg, #fbbf24 280deg, #a855f7 330deg, #f59e0b 360deg)",
            }}
          />

          {/* Layer 3: Central liquid core pulse & Golden Nebula highlight */}
          <div
            className="absolute top-1/4 left-1/4 w-1/2 h-1/2 rounded-full mix-blend-lighten filter blur-sm animate-orb-pulse"
            style={{
              background:
                "radial-gradient(circle at 42% 40%, rgba(255, 255, 255, 0.95) 0%, rgba(251, 191, 36, 0.8) 30%, rgba(236, 72, 153, 0.6) 60%, rgba(14, 165, 233, 0.3) 85%, transparent 100%)",
            }}
          />

          {/* Spherical inner 3D depth and dark perimeter vignette */}
          <div
            className="absolute inset-0 rounded-full pointer-events-none"
            style={{
              boxShadow:
                "inset 0 0 50px rgba(0, 0, 0, 0.95), inset 0 -20px 35px rgba(0, 0, 0, 0.98), inset 0 2px 12px rgba(255, 255, 255, 0.6)",
            }}
          />

          {/* Top-edge curved glass specular reflection arc */}
          <div className="absolute top-1.5 left-6 right-6 h-7 rounded-full bg-gradient-to-b from-white/70 via-white/20 to-transparent blur-[1px] pointer-events-none" />

          {/* Subtle bottom rim reflection */}
          <div className="absolute bottom-2 left-8 right-8 h-3 rounded-full bg-gradient-to-t from-cyan-400/40 via-cyan-400/10 to-transparent blur-[2px] pointer-events-none" />
        </div>
      </div>
    </div>
  );
};

export default IridescentOrb;
