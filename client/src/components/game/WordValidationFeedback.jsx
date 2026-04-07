import React, { useEffect, useRef } from 'react';

const ENCOURAGING = [
  'Nice word! +{pts} pts! 🎉',
  'Great play! +{pts} pts! ⭐',
  'Awesome! +{pts} pts! 🔥',
  'Well done! +{pts} pts! 🌟',
  'Excellent! +{pts} pts! 💪',
  'Brilliant! +{pts} pts! 🚀',
  'Super! +{pts} pts! 🎯',
  'Amazing! +{pts} pts! ✨',
];

/**
 * Shows move result or invalid move message.
 * Props:
 *   lastMoveResult  { wordsFormed, moveScore, bySocketId, byName } | null
 *   invalidMoveMsg  string | null
 *   mySocketId      string
 *   onClear         fn
 */
export default function WordValidationFeedback({ lastMoveResult, invalidMoveMsg, mySocketId, onClear }) {
  const timerRef = useRef(null);

  useEffect(() => {
    if (lastMoveResult || invalidMoveMsg) {
      clearTimeout(timerRef.current);
      timerRef.current = setTimeout(onClear, 3500);
    }
    return () => clearTimeout(timerRef.current);
  }, [lastMoveResult, invalidMoveMsg, onClear]);

  if (invalidMoveMsg) {
    return (
      <div className="feedback-banner feedback-wrong">
        😅 {invalidMoveMsg}
      </div>
    );
  }

  if (lastMoveResult) {
    const { wordsFormed, moveScore, bySocketId, byName } = lastMoveResult;
    const isMe = bySocketId === mySocketId;
    const template = ENCOURAGING[Math.floor(Math.random() * ENCOURAGING.length)];
    const msg = template.replace('{pts}', moveScore);

    return (
      <div className="feedback-banner feedback-correct">
        {isMe ? msg : `${byName} played ${wordsFormed.join(', ')} for ${moveScore} pts!`}
      </div>
    );
  }

  return null;
}
