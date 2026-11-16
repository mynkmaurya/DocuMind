import React from "react";

interface IridescentOrbProps {
  size?: "sm" | "md" | "lg";
  className?: string;
  isStreaming?: boolean;
  theme?: "dark" | "light";
  onClick?: () => void;
}

export const IridescentOrb: React.FC<IridescentOrbProps> = ({
  size = "md",
  className = "",
  isStreaming = false,
  theme = "dark",
  onClick,
}) => {
  const isLight = theme === "light";

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
      aria-label="Iridescent Nebula AI Orb"
      className={`orb-element relative flex items-center justify-center select-none cursor-pointer group transition-transform duration-700 ease-out hover:scale-105 active:scale-95 transform-gpu ${sizeClasses} ${className}`}
    >
      {/* Outer ambient atmospheric glow halo */}
      <div
        className={`orb-element absolute inset-0 rounded-full blur-2xl transition-all duration-1000 pointer-events-none group-hover:scale-120 ${
          isStreaming ? "scale-130 opacity-95 blur-3xl" : "scale-100 opacity-70"
        }`}
        style={{
          background: isLight
            ? "radial-gradient(circle, rgba(76, 157, 176, 0.5) 0%, rgba(255, 235, 175, 0.4) 45%, rgba(76, 157, 176, 0.15) 75%, transparent 85%)"
            : "radial-gradient(circle, rgba(237, 37, 78, 0.45) 0%, rgba(1, 25, 54, 0.6) 45%, rgba(237, 37, 78, 0.2) 75%, transparent 85%)",
        }}
      />

      {/* Outer metallic bezel ring */}
      <div
        className={`orb-element relative w-full h-full rounded-full p-1.5 shadow-[0_20px_50px_rgba(0,0,0,0.9)] transition-colors duration-500 ${
          isLight
            ? "bg-gradient-to-b from-[#4C9DB0]/60 via-[#FFEBAF]/50 to-[#4C9DB0]/30"
            : "bg-gradient-to-b from-[#ED254E]/50 via-[#011936] to-[#ED254E]/20"
        }`}
      >
        {/* Main 3D spherical body with swirling fluid ribbons */}
        <div
          className={`orb-element relative w-full h-full rounded-full overflow-hidden shadow-[inset_0_-16px_32px_rgba(0,0,0,0.92),inset_0_4px_14px_rgba(255,255,255,0.4)] animate-orb-float border ${
            isLight ? "border-[#4C9DB0]/40" : "border-[#ED254E]/40"
          }`}
        >
          {/* Deep core background */}
          <div
            className="orb-element absolute inset-0 transition-colors duration-500"
            style={{
              background: isLight
                ? "radial-gradient(circle at 45% 35%, #4C9DB0 0%, #1d4650 60%, #0c2025 100%)"
                : "radial-gradient(circle at 45% 35%, #011936 0%, #000c1c 60%, #00050c 100%)",
            }}
          />

          {/* Layer 1: Swirling primary ribbon */}
          <div
            className="orb-element absolute -inset-1/2 rounded-full opacity-85 mix-blend-screen filter blur-md animate-orb-swirl"
            style={{
              background: isLight
                ? "conic-gradient(from 180deg at 50% 50%, #FFEBAF 0deg, #4C9DB0 60deg, #0284c7 120deg, #FFEBAF 180deg, #38bdf8 260deg, #0f766e 320deg, #FFEBAF 360deg)"
                : "conic-gradient(from 180deg at 50% 50%, #ED254E 0deg, #fbbf24 60deg, #011936 120deg, #ED254E 180deg, #f43f5e 260deg, #022045 320deg, #ED254E 360deg)",
            }}
          />

          {/* Layer 2: Swirling secondary ribbon (Reverse swirl) */}
          <div
            className="orb-element absolute -inset-1/3 rounded-full opacity-75 mix-blend-color-dodge filter blur-lg animate-orb-swirl [animation-direction:reverse] [animation-duration:15s]"
            style={{
              background: isLight
                ? "conic-gradient(from 45deg at 50% 50%, #ffffff 0deg, #4C9DB0 90deg, #FFEBAF 180deg, #0284c7 270deg, #ffffff 360deg)"
                : "conic-gradient(from 45deg at 50% 50%, #ffffff 0deg, #ED254E 90deg, #011936 180deg, #fbbf24 270deg, #ffffff 360deg)",
            }}
          />

          {/* Layer 3: Central core pulse */}
          <div
            className="orb-element absolute top-1/4 left-1/4 w-1/2 h-1/2 rounded-full mix-blend-lighten filter blur-sm animate-orb-pulse"
            style={{
              background: isLight
                ? "radial-gradient(circle at 40% 40%, rgba(255, 235, 175, 0.95) 0%, rgba(76, 157, 176, 0.75) 40%, transparent 100%)"
                : "radial-gradient(circle at 40% 40%, rgba(255, 255, 255, 0.95) 0%, rgba(237, 37, 78, 0.8) 40%, rgba(1, 25, 54, 0.3) 80%, transparent 100%)",
            }}
          />

          {/* 3D spherical inner shadow */}
          <div
            className="orb-element absolute inset-0 rounded-full pointer-events-none"
            style={{
              boxShadow:
                "inset 0 0 45px rgba(0, 0, 0, 0.9), inset 0 -18px 30px rgba(0, 0, 0, 0.95), inset 0 2px 10px rgba(255, 255, 255, 0.55)",
            }}
          />

          {/* Top-edge specular arc highlight */}
          <div className="orb-element absolute top-1.5 left-5 right-5 h-7 rounded-full bg-gradient-to-b from-white/75 via-white/25 to-transparent blur-[1px] pointer-events-none" />

          {/* Bottom-edge rim reflection */}
          <div
            className="orb-element absolute bottom-1.5 left-7 right-7 h-2 rounded-full blur-[1px] pointer-events-none"
            style={{
              background: isLight
                ? "linear-gradient(to top, rgba(76, 157, 176, 0.5), transparent)"
                : "linear-gradient(to top, rgba(237, 37, 78, 0.5), transparent)",
            }}
          />
        </div>
      </div>
    </div>
  );
};

export default IridescentOrb;
