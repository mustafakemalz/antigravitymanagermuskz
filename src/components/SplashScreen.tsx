import React from 'react';

export const SplashScreen: React.FC = () => {
  const pixelProfile = new URL('../assets/pixel_profile.png', import.meta.url).href;

  return (
    <div className="bg-background text-foreground flex h-screen w-full items-center justify-center">
      <div className="flex flex-col items-center gap-8 px-8 text-center">
        <img
          src={pixelProfile}
          alt="Muskz Command"
          className="h-20 w-20 border border-white/10 object-cover"
        />
        <div className="space-y-3">
          <div className="terminal-meta text-center">SYSTEM INITIALIZING</div>
          <div className="text-2xl font-medium uppercase tracking-[0.32em]">COMMAND</div>
        </div>
      </div>
    </div>
  );
};
