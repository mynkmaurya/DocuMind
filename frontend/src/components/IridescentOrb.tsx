import React from "react";

interface IridescentOrbProps {
  size?: "sm" | "md" | "lg";
  className?: string;
  isStreaming?: boolean;
}

export const IridescentOrb: React.FC<IridescentOrbProps> = ({
  size = "md",
  className = "",
  isStreaming = false,
}) => {
  const sizeClasses = {
    sm: "w-24 h-24 sm:w-28 sm:h-28",
    md: "w-36 h-36 sm:w-44 sm:h-44 md:w-48 md:h-48",
    lg: "w-44 h-44 sm:w-52 sm:h-52 md:w-60 md:h-60",
  }[size];

  return (
    <div
      className={`relative flex items-center justify-center select-none ${sizeClasses} ${className}`}
      aria-hidden="true"
    >
      {/* Outer ambient glow halo */}
      <div
        className={`absolute inset-0 rounded-full blur-2xl opacity-70 transition-all duration-700 pointer-events-none ${
          isStreaming ? "scale-125 opacity-90 blur-3xl" : "scale-105"
        }`}
        style={{
          background:
            "radial-gradient(circle, rgba(56, 189, 248, 0.45) 0%, rgba(139, 92, 246, 0.35) 45%, rgba(236, 72, 153, 0.2) 70%, transparent 85%)",
        }}
      />

      {/* Main spherical body */}
      <div className="relative w-full h-full rounded-full overflow-hidden shadow-[inset_0_-12px_24px_rgba(0,0,0,0.85),0_15px_35px_rgba(0,0,0,0.9)] animate-orb-float border border-white/10">
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

        {/* Swirling iridescent fluid layer 2 (Cyan & neon electric flow) */}
        <div
          className="absolute -inset-1/3 rounded-full opacity-75 mix-blend-color-dodge filter blur-lg animate-orb-swirl [animation-direction:reverse] [animation-duration:18s]"
          style={{
            background:
              "conic-gradient(from 45deg at 50% 50%, #06b6d4 0deg, #3b82f6 120deg, #a855f7 220deg, #ec4899 300deg, #06b6d4 360deg)",
          }}
        />

        {/* Central glowing fluid nexus (Orange/gold/electric cyan refraction) */}
        <div
          className="absolute top-1/4 left-1/4 w-1/2 h-1/2 rounded-full mix-blend-lighten filter blur-sm animate-orb-pulse"
          style={{
            background:
              "radial-gradient(circle at 40% 40%, rgba(254, 240, 138, 0.85) 0%, rgba(249, 115, 22, 0.65) 35%, rgba(139, 92, 246, 0.45) 70%, transparent 100%)",
          }}
        />

        {/* Dynamic fluid distortion ripple */}
        <div
          className="absolute inset-2 rounded-full opacity-90 mix-blend-overlay"
          style={{
            background:
              "radial-gradient(ellipse at 30% 25%, rgba(255, 255, 255, 0.5) 0%, rgba(255, 255, 255, 0.1) 40%, transparent 70%)",
          }}
        />

        {/* 3D sphere spherical shadow & rim shadow */}
        <div
          className="absolute inset-0 rounded-full pointer-events-none"
          style={{
            boxShadow:
              "inset 0 0 40px rgba(0, 0, 0, 0.85), inset 0 -15px 30px rgba(0, 0, 0, 0.9), inset 0 2px 8px rgba(255, 255, 255, 0.35)",
          }}
        />

        {/* Specular glass reflection crest on upper edge */}
        <div className="absolute top-2 left-6 right-6 h-10 rounded-full bg-gradient-to-b from-white/35 to-transparent blur-[1.5px] pointer-events-none" />
      </div>
    </div>
  );
};

export default IridescentOrb;
