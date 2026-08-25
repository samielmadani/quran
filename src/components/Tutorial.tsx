import { IonIcon } from '@ionic/react';
import { chevronForward, close } from 'ionicons/icons';
import { useEffect, useState, type CSSProperties } from 'react';

interface TutorialProps {
  onComplete: () => void;
}

const tips = [
  ['tutorial-surah-selector', 'Choose a Surah (Chapter)', 'Choose a chapter from the header or player footer.'],
  ['tutorial-reciter-selector', 'Choose your reciter', 'Pick a reciter and download audio for offline listening.'],
  ['tutorial-play', 'Play the recitation', 'Start or pause the current ayah. Previous and next move through the recitation.'],
  ['tutorial-settings', 'Open Settings', 'Adjust reading, translation, repeat, and playback preferences.'],
];

export function Tutorial({ onComplete }: TutorialProps) {
  const [step, setStep] = useState(0);
  const isLast = step === tips.length - 1;
  const [targetId, title, message] = tips[step];
  const [position, setPosition] = useState({ top: 0, left: 16, arrowLeft: 24, placement: 'below' });

  useEffect(() => {
    const updatePosition = () => {
      const target = document.getElementById(targetId);
      if (!target) return;
      const rect = target.getBoundingClientRect();
      const width = Math.min(352, window.innerWidth - 32);
      const left = Math.max(16, Math.min(window.innerWidth - width - 16, rect.left + rect.width / 2 - width / 2));
      const belowTop = rect.bottom + 18;
      const aboveTop = rect.top - 168;
      const placement = belowTop + 150 <= window.innerHeight || aboveTop < 16 ? 'below' : 'above';
      const top = placement === 'below' ? belowTop : aboveTop;
      setPosition({ top, left, arrowLeft: Math.max(18, Math.min(width - 18, rect.left + rect.width / 2 - left)), placement });
      target.classList.add('tutorial-target');
    };
    updatePosition();
    window.addEventListener('resize', updatePosition);
    window.addEventListener('orientationchange', updatePosition);
    window.addEventListener('scroll', updatePosition, true);
    return () => {
      document.getElementById(targetId)?.classList.remove('tutorial-target');
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('orientationchange', updatePosition);
      window.removeEventListener('scroll', updatePosition, true);
    };
  }, [targetId]);

  return (
    <>
      <div className="tutorial-backdrop" aria-hidden="true" />
      <div
        className={`tutorial-popover ${position.placement}`}
        role="dialog"
        aria-label="Quran controls tutorial"
        style={{ top: position.top, left: position.left, '--tutorial-arrow-left': `${position.arrowLeft}px` } as CSSProperties}
      >
      <button className="tutorial-close" type="button" onClick={onComplete} aria-label="Skip tutorial"><IonIcon icon={close} /></button>
      <span className="tutorial-step">{step + 1} / {tips.length}</span>
      <strong>{title}</strong>
      <p>{message}</p>
      <button className="tutorial-next" type="button" onClick={() => isLast ? onComplete() : setStep((value) => value + 1)}>
        {isLast ? 'Done' : 'Next'} <IonIcon icon={chevronForward} />
      </button>
      </div>
    </>
  );
}
