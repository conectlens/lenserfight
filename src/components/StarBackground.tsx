import React, { useEffect, useState, useMemo } from 'react';
import Particles, { initParticlesEngine } from "@tsparticles/react";
import { loadSlim } from "@tsparticles/slim";
import { useTheme } from '../context/ThemeContext';

const StarBackground: React.FC = () => {
  const [init, setInit] = useState(false);
  const { theme } = useTheme();
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  useEffect(() => {
    // Using simple promise chaining to handle initialization errors robustly
    initParticlesEngine(async (engine) => {
      await loadSlim(engine);
    }).then(() => {
      setInit(true);
    }).catch(console.error);
  }, []);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const options = useMemo(
    () => ({
      background: {
        color: {
          value: "transparent",
        },
      },
      fpsLimit: 60,
      interactivity: {
        events: {
          onClick: { enable: false },
          onHover: { enable: false },
          resize: { enable: true },
        },
      },
      particles: {
        color: { value: "#ffffff" },
        links: { enable: false },
        move: {
          direction: "none" as const,
          enable: true,
          outModes: { default: "out" as const },
          random: true,
          speed: 0.3,
          straight: false,
        },
        number: {
          density: { enable: true, width: 800, height: 800 },
          value: 30,
        },
        opacity: {
          value: { min: 0.05, max: 0.12 },
          animation: {
            enable: true,
            speed: 0.5,
            sync: false
          }
        },
        shape: { type: "circle" },
        size: { value: { min: 1, max: 2 } },
      },
      detectRetina: true,
      fullScreen: { enable: false, zIndex: 0 },
    }),
    [],
  );

  if (!init || theme !== 'dark' || isMobile) return null;

  return (
    <div className="fixed inset-0 pointer-events-none z-0">
        <Particles
            id="tsparticles"
            // @ts-ignore - options strict typing
            options={options}
            className="w-full h-full"
        />
    </div>
  );
};

export default StarBackground;