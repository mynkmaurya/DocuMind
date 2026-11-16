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
      aria-label="Liquid Chrome Mercury AI Core Sphere"
      className={`relative flex items-center justify-center select-none cursor-pointer group transition-transform duration-700 ease-out hover:scale-105 active:scale-95 transform-gpu ${sizeClasses} ${className}`}
    >
      {/* Outer ambient liquid chrome / silver smoke glow halo */}
      <div
        className={`absolute inset-0 rounded-full blur-2xl opacity-60 transition-all duration-1000 pointer-events-none group-hover:scale-115 group-hover:opacity-85 ${
          isStreaming ? "scale-125 opacity-90 blur-3xl" : "scale-100"
        }`}
        style={{
          background:
            "radial-gradient(circle, rgba(255, 255, 255, 0.22) 0%, rgba(148, 163, 184, 0.18) 45%, rgba(51, 65, 85, 0.12) 70%, transparent 85%)",
        }}
      />

      {/* Outer metallic bezel ring matching the exact Figma chrome sphere */}
      <div className="relative w-full h-full rounded-full p-1.5 bg-gradient-to-b from-white/40 via-slate-600/60 to-white/15 shadow-[0_20px_50px_rgba(0,0,0,0.95)]">
        {/* Main 3D spherical body with swirling liquid mercury / chrome */}
        <div className="relative w-full h-full rounded-full overflow-hidden shadow-[inset_0_-16px_32px_rgba(0,0,0,0.95),inset_0_4px_14px_rgba(255,255,255,0.45)] animate-orb-float border border-white/20">
          {/* Deep dark obsidian base */}
          <div
            className="absolute inset-0"
            style={{
              background:
                "radial-gradient(circle at 45% 35%, #1e2638 0%, #0d121c 55%, #030508 100%)",
            }}
          />

          {/* Layer 1: Swirling liquid silver & mercury fluid ribbons */}
          <div
            className="absolute -inset-1/2 rounded-full opacity-85 mix-blend-screen filter blur-md animate-orb-swirl"
            style={{
              background:
                "conic-gradient(from 180deg at 50% 50%, #ffffff 0deg, #94a3b8 50deg, #1e293b 110deg, #ffffff 170deg, #cbd5e1 240deg, #0f172a 300deg, #ffffff 360deg)",
            }}
          />

          {/* Layer 2: Swirling reflective chrome fluid ribbons (Reverse swirl) */}
          <div
            className="absolute -inset-1/3 rounded-full opacity-75 mix-blend-color-dodge filter blur-lg animate-orb-swirl [animation-direction:reverse] [animation-duration:16s]"
            style={{
              background:
                "conic-gradient(from 45deg at 50% 50%, #f8fafc 0deg, #64748b 80deg, #ffffff 160deg, #334155 240deg, #e2e8f0 310deg, #f8fafc 360deg)",
            }}
          />

          {/* Layer 3: Central liquid chrome molten core pulse */}
          <div
            className="absolute top-1/4 left-1/4 w-1/2 h-1/2 rounded-full mix-blend-lighten filter blur-sm animate-orb-pulse"
            style={{
              background:
                "radial-gradient(circle at 40% 40%, rgba(255, 255, 255, 0.98) 0%, rgba(226, 232, 240, 0.75) 35%, rgba(148, 163, 184, 0.35) 75%, transparent 100%)",
            }}
          />

          {/* 3D spherical inner shadow and dark perimeter vignette */}
          <div
            className="absolute inset-0 rounded-full pointer-events-none"
            style={{
              boxShadow:
                "inset 0 0 45px rgba(0, 0, 0, 0.95), inset 0 -18px 30px rgba(0, 0, 0, 0.98), inset 0 2px 10px rgba(255, 255, 255, 0.6)",
            }}
          />

          {/* Top-edge specular chrome arc highlight */}
          <div className="absolute top-1.5 left-5 right-5 h-7 rounded-full bg-gradient-to-b from-white/75 via-white/25 to-transparent blur-[1px] pointer-events-none" />

          {/* Subtle bottom-edge rim reflection */}
          <div className="absolute bottom-1.5 left-7 right-7 h-2 rounded-full bg-gradient-to-t from-white/30 to-transparent blur-[1px] pointer-events-none" />
        </div>
      </div>
    </div>
  );
};

export default IridescentOrb;
