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
    md: "w-36 h-36 sm:w-44 sm:h-44 md:w-48 md:h-48",
    lg: "w-44 h-44 sm:w-52 sm:h-52 md:w-60 md:h-60",
  }[size];

  return (
    <div
      onClick={onClick}
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      aria-label="Interactive AI Core Orb"
      className={`relative flex items-center justify-center select-none cursor-pointer group transition-transform duration-700 ease-out hover:scale-105 active:scale-95 transform-gpu ${sizeClasses} ${className}`}
    >
      {/* Outer ambient glow halo */}
      <div
        className={`absolute inset-0 rounded-full blur-2xl opacity-75 transition-all duration-1000 pointer-events-none group-hover:scale-115 group-hover:opacity-90 ${
          isStreaming ? "scale-130 opacity-95 blur-3xl" : "scale-105"
        }`}
        style={{
          background:
            "radial-gradient(circle, rgba(56, 189, 248, 0.5) 0%, rgba(139, 92, 246, 0.4) 45%, rgba(236, 72, 153, 0.25) 70%, transparent 85%)",
        }}
      />

      {/* Main spherical body with floating & breathing keyframes */}
      <div className="relative w-full h-full rounded-full overflow-hidden shadow-[inset_0_-12px_24px_rgba(0,0,0,0.85),0_20px_45px_rgba(0,0,0,0.9)] animate-orb-float border border-white/10 group-hover:border-white/20 transition-colors duration-500">
        {/* Deep cosmic base */}
        <div
          className="absolute inset-0"
          style={{
            background:
              "radial-gradient(circle at 45% 40%, #0d1629 0%, #050811 75%, #020307 100%)",
          }}
        />

        {/* Swirling iridescent fluid layer 1 (Magenta & violet) */}
        <div
          className="absolute -inset-1/2 rounded-full opacity-85 mix-blend-screen filter blur-md animate-orb-swirl"
          style={{
            background:
              "conic-gradient(from 180deg at 50% 50%, #38bdf8 0deg, #818cf8 90deg, #ec4899 180deg, #f59e0b 260deg, #38bdf8 360deg)",
          }}
        />

        {/* Swirling iridescent fluid layer 2 (Cyan & electric flow) */}
        <div
          className="absolute -inset-1/3 rounded-full opacity-75 mix-blend-color-dodge filter blur-lg animate-orb-swirl [animation-direction:reverse] [animation-duration:18s]"
          style={{
            background:
              "conic-gradient(from 45deg at 50% 50%, #06b6d4 0deg, #3b82f6 120deg, #a855f7 220deg, #ec4899 300deg, #06b6d4 360deg)",
          }}
        />

        {/* Central glowing fluid nexus (Amber/gold core) */}
        <div
          className="absolute top-1/4 left-1/4 w-1/2 h-1/2 rounded-full mix-blend-lighten filter blur-sm animate-orb-pulse"
          style={{
            background:
              "radial-gradient(circle at 40% 40%, rgba(254, 240, 138, 0.9) 0%, rgba(249, 115, 22, 0.7) 35%, rgba(139, 92, 246, 0.5) 70%, transparent 100%)",
          }}
        />

        {/* Fluid distortion highlight */}
        <div
          className="absolute inset-2 rounded-full opacity-90 mix-blend-overlay transition-opacity duration-500 group-hover:opacity-100"
          style={{
            background:
              "radial-gradient(ellipse at 30% 25%, rgba(255, 255, 255, 0.6) 0%, rgba(255, 255, 255, 0.15) 40%, transparent 70%)",
          }}
        />

        {/* 3D sphere depth shadow */}
        <div
          className="absolute inset-0 rounded-full pointer-events-none"
          style={{
            boxShadow:
              "inset 0 0 45px rgba(0, 0, 0, 0.88), inset 0 -18px 32px rgba(0, 0, 0, 0.92), inset 0 2px 8px rgba(255, 255, 255, 0.4)",
          }}
        />

        {/* Specular glass reflection crest on upper edge */}
        <div className="absolute top-2 left-6 right-6 h-10 rounded-full bg-gradient-to-b from-white/40 to-transparent blur-[1.5px] pointer-events-none transition-all duration-500 group-hover:from-white/60" />
      </div>
    </div>
  );
};

export default IridescentOrb;
