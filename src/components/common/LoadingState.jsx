import React from 'react';
import { FaChalkboardTeacher } from 'react-icons/fa';

const layoutClasses = {
  full: 'w-full min-h-[260px] py-16 px-6',
  card: 'w-full py-12 px-6',
  inline: 'inline-flex flex-row items-center gap-4 py-4 px-6',
};

const LoadingState = ({
  title = 'Loading…',
  subtitle = 'Please hold on for a moment.',
  layout = 'full',
  className = '',
  showSpinner = true,
  children,
}) => {
  const wrapperClasses = layoutClasses[layout] || layoutClasses.full;
  const spinnerSize = layout === 'inline' ? 56 : 72;
  const iconSize = layout === 'inline' ? 'text-2xl' : 'text-3xl';

  return (
    <section
      className={`relative overflow-hidden rounded-2xl shadow-md border border-white/30 backdrop-blur ${wrapperClasses} ${layout === 'inline' ? 'flex items-center justify-start text-left' : 'flex flex-col items-center justify-center text-center'} ${className}`.trim()}
      style={{
        backgroundColor: '#F0D8D9',
        backgroundImage:
          'radial-gradient(140% 140% at 50% -25%, rgba(255, 238, 240, 0.95) 0%, rgba(240, 216, 217, 0.9) 45%, rgba(223, 204, 205, 0.88) 70%, rgba(212, 195, 197, 0.85) 100%)',
      }}
      aria-live="polite"
    >
      <div className="absolute inset-0 opacity-60 mix-blend-soft-light pointer-events-none">
        <svg
          className="w-full h-full"
          viewBox="0 0 600 400"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <g opacity="0.35">
            <circle cx="120" cy="60" r="90" fill="url(#paint0_radial)" />
            <circle cx="520" cy="80" r="110" fill="url(#paint1_radial)" />
            <circle cx="360" cy="320" r="130" fill="url(#paint2_radial)" />
          </g>
          <defs>
            <radialGradient id="paint0_radial" cx="0" cy="0" r="1" gradientUnits="userSpaceOnUse" gradientTransform="translate(120 60) rotate(90) scale(90)">
              <stop stopColor="#FFE2F0" />
              <stop offset="1" stopColor="#FFE2F0" stopOpacity="0" />
            </radialGradient>
            <radialGradient id="paint1_radial" cx="0" cy="0" r="1" gradientUnits="userSpaceOnUse" gradientTransform="translate(520 80) rotate(90) scale(110)">
              <stop stopColor="#E0F2F1" />
              <stop offset="1" stopColor="#E0F2F1" stopOpacity="0" />
            </radialGradient>
            <radialGradient id="paint2_radial" cx="0" cy="0" r="1" gradientUnits="userSpaceOnUse" gradientTransform="translate(360 320) rotate(90) scale(130)">
              <stop stopColor="#FDE7FF" />
              <stop offset="1" stopColor="#FDE7FF" stopOpacity="0" />
            </radialGradient>
          </defs>
        </svg>
      </div>

      <div className={`${layout === 'inline' ? 'flex items-center gap-4' : 'flex flex-col items-center gap-6'} relative z-10`}> 
        {showSpinner && (
          <span
            className="relative flex items-center justify-center"
            style={{ width: spinnerSize, height: spinnerSize }}
          >
            <svg
              className="absolute"
              width={spinnerSize}
              height={spinnerSize}
              viewBox="0 0 64 64"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <circle
                cx="32"
                cy="32"
                r="28"
                stroke="rgba(162, 3, 93, 0.15)"
                strokeWidth="4"
              />
              <circle
                cx="32"
                cy="32"
                r="28"
                stroke="#A2035D"
                strokeWidth="4"
                strokeLinecap="round"
                strokeDasharray="110 40"
                className="animate-[dash_1.3s_linear_infinite]"
              />
              <defs>
                <style>{`@keyframes dash {
                  0% { stroke-dashoffset: 0; }
                  100% { stroke-dashoffset: -300; }
                }`}</style>
              </defs>
            </svg>
            <FaChalkboardTeacher className={`${iconSize} text-[#A2035D]`} />
          </span>
        )}

        <div className={`${layout === 'inline' ? 'space-y-0' : 'space-y-3'} text-slate-700`}> 
          <h2 className={`font-semibold tracking-tight text-[#3A3A3A] ${layout === 'inline' ? 'text-lg' : 'text-2xl'}`}>
            {title}
          </h2>
          {subtitle && (
            <p className={`text-sm ${layout === 'inline' ? 'text-slate-600' : 'text-slate-600/90'} max-w-md`}>{subtitle}</p>
          )}
        </div>

        {children}
      </div>
    </section>
  );
};

export default LoadingState;

