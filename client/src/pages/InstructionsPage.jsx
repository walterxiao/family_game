import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGame } from '../context/GameContext';

const STEPS = [
  {
    icon: '🧩',
    title: 'Solve your own puzzle',
    body: 'Everyone gets a different puzzle on their iPad — math or word questions matched to your age. Solve it on your own!',
  },
  {
    icon: '📢',
    title: 'Shout your clue word!',
    body: 'After you solve it, you\'ll see a secret clue word. Say it out loud so everyone can hear it!',
  },
  {
    icon: '🤝',
    title: 'Solve the final challenge together',
    body: 'Once everyone has shared their clue word, work as a team to answer the final question using all the clues.',
  },
  {
    icon: '🏆',
    title: 'Escape the room!',
    body: 'Get the final answer right to escape! Then move on to the next room. Can you escape all of them?',
  },
];

const COUNTDOWN = 5;

export default function InstructionsPage() {
  const { state } = useGame();
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [countdown, setCountdown] = useState(null);

  useEffect(() => {
    if (!state.roomCode) { navigate('/'); }
  }, [state.roomCode, navigate]);

  // Start countdown on the last step
  useEffect(() => {
    if (step === STEPS.length - 1) {
      setCountdown(COUNTDOWN);
    }
  }, [step]);

  useEffect(() => {
    if (countdown === null) return;
    if (countdown === 0) { navigate('/game'); return; }
    const t = setTimeout(() => setCountdown(c => c - 1), 1000);
    return () => clearTimeout(t);
  }, [countdown, navigate]);

  const isLast = step === STEPS.length - 1;
  const current = STEPS[step];

  return (
    <div className="page">
      {/* Step dots */}
      <div style={{ display: 'flex', gap: 8 }}>
        {STEPS.map((_, i) => (
          <div key={i} style={{
            width: i === step ? 24 : 8,
            height: 8,
            borderRadius: 99,
            background: i === step ? 'var(--accent)' : 'rgba(255,255,255,0.15)',
            transition: 'width 0.3s',
          }} />
        ))}
      </div>

      {/* Step card */}
      <div className="card" style={{ width: '100%', maxWidth: 480, textAlign: 'center' }}>
        <div style={{ fontSize: '4rem', marginBottom: 16 }}>{current.icon}</div>
        <h2 style={{ marginBottom: 12 }}>{current.title}</h2>
        <p style={{ fontSize: '1.05rem', lineHeight: 1.7, color: 'var(--muted)' }}>
          {current.body}
        </p>
      </div>

      {/* Navigation */}
      <div style={{ width: '100%', maxWidth: 480, display: 'flex', flexDirection: 'column', gap: 10 }}>
        {!isLast ? (
          <>
            <button className="btn btn-primary" onClick={() => setStep(s => s + 1)}>
              Next →
            </button>
            <button className="btn btn-ghost" style={{ fontSize: '0.9rem' }}
              onClick={() => navigate('/game')}>
              Skip — I know how to play
            </button>
          </>
        ) : (
          <>
            <button className="btn btn-success" onClick={() => navigate('/game')}>
              {countdown !== null
                ? `Let's go! (${countdown})`
                : "Let's go!"}
            </button>
            <button className="btn btn-ghost" style={{ fontSize: '0.9rem' }}
              onClick={() => setStep(0)}>
              ← Read again
            </button>
          </>
        )}
      </div>

      <p className="text-muted" style={{ fontSize: '0.8rem' }}>
        Step {step + 1} of {STEPS.length}
      </p>
    </div>
  );
}
