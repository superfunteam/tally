import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';

interface ScanningOverlayProps {
  status: 'pending' | 'uploading' | 'analyzing' | 'extracting';
}

const statusMessages = {
  pending: ['Waiting in queue...', 'Almost there...', 'Hang tight...'],
  uploading: ['Uploading...', 'Sending data...', 'Almost uploaded...'],
  analyzing: ['Scanning document...', 'Reading text...', 'Finding details...', 'Almost done...'],
  extracting: ['Extracting data...', 'Parsing amounts...', 'Finalizing...'],
};

const funFacts = [
  'AI can read receipts faster than humans',
  'Detecting handwritten tips...',
  'Looking for hidden fees...',
  'Checking the math...',
  'Finding merchant info...',
];

export function ScanningOverlay({ status }: ScanningOverlayProps) {
  const [elapsed, setElapsed] = useState(0);
  const [messageIndex, setMessageIndex] = useState(0);
  const [factIndex, setFactIndex] = useState(0);

  // Timer
  useEffect(() => {
    const timer = setInterval(() => {
      setElapsed((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Rotate messages
  useEffect(() => {
    const messages = statusMessages[status];
    const interval = setInterval(() => {
      setMessageIndex((prev) => (prev + 1) % messages.length);
    }, 2000);
    return () => clearInterval(interval);
  }, [status]);

  // Rotate fun facts
  useEffect(() => {
    const interval = setInterval(() => {
      setFactIndex((prev) => (prev + 1) % funFacts.length);
    }, 3500);
    return () => clearInterval(interval);
  }, []);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return mins > 0 ? `${mins}:${secs.toString().padStart(2, '0')}` : `${secs}s`;
  };

  const messages = statusMessages[status];

  return (
    <div className="absolute inset-0 overflow-hidden">
      {/* Gradient overlay */}
      <motion.div
        className="absolute inset-0"
        style={{
          background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.85) 0%, rgba(79, 70, 229, 0.9) 100%)',
        }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
      />

      {/* Animated scan line */}
      <motion.div
        className="absolute left-0 right-0 h-1"
        style={{
          background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.8), transparent)',
          boxShadow: '0 0 20px rgba(255,255,255,0.5)',
        }}
        animate={{
          top: ['0%', '100%', '0%'],
        }}
        transition={{
          duration: 2,
          repeat: Infinity,
          ease: 'linear',
        }}
      />

      {/* Pulsing circles */}
      <div className="absolute inset-0 flex items-center justify-center">
        <motion.div
          className="absolute w-32 h-32 rounded-full border-2 border-white/30"
          animate={{
            scale: [1, 1.5, 1],
            opacity: [0.5, 0, 0.5],
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: 'easeOut',
          }}
        />
        <motion.div
          className="absolute w-24 h-24 rounded-full border-2 border-white/40"
          animate={{
            scale: [1, 1.4, 1],
            opacity: [0.6, 0, 0.6],
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: 'easeOut',
            delay: 0.3,
          }}
        />
        <motion.div
          className="absolute w-16 h-16 rounded-full border-2 border-white/50"
          animate={{
            scale: [1, 1.3, 1],
            opacity: [0.7, 0.2, 0.7],
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: 'easeOut',
            delay: 0.6,
          }}
        />
      </div>

      {/* Center content */}
      <div className="absolute inset-0 flex flex-col items-center justify-center text-white">
        {/* Animated icon */}
        <motion.div
          className="relative"
          animate={{
            rotateY: [0, 360],
          }}
          transition={{
            duration: 3,
            repeat: Infinity,
            ease: 'linear',
          }}
        >
          <motion.span
            className="material-icons text-5xl"
            animate={{
              scale: [1, 1.1, 1],
            }}
            transition={{
              duration: 1,
              repeat: Infinity,
            }}
          >
            {status === 'pending' ? 'hourglass_empty' :
             status === 'uploading' ? 'cloud_upload' :
             status === 'analyzing' ? 'document_scanner' : 'auto_awesome'}
          </motion.span>
        </motion.div>

        {/* Status message */}
        <motion.p
          key={messageIndex}
          className="text-lg font-semibold mt-4"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
        >
          {messages[messageIndex]}
        </motion.p>

        {/* Timer */}
        <motion.div
          className="mt-3 px-4 py-1.5 rounded-full bg-white/20 backdrop-blur-sm"
          animate={{
            scale: [1, 1.02, 1],
          }}
          transition={{
            duration: 1,
            repeat: Infinity,
          }}
        >
          <span className="text-sm font-mono font-bold">{formatTime(elapsed)}</span>
        </motion.div>

        {/* Fun fact */}
        <motion.p
          key={factIndex}
          className="text-xs mt-4 opacity-75 max-w-[80%] text-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.75 }}
          transition={{ duration: 0.5 }}
        >
          {funFacts[factIndex]}
        </motion.p>
      </div>

      {/* Corner decorations */}
      <motion.div
        className="absolute top-3 left-3 w-6 h-6 border-l-2 border-t-2 border-white/50"
        animate={{ opacity: [0.5, 1, 0.5] }}
        transition={{ duration: 1.5, repeat: Infinity }}
      />
      <motion.div
        className="absolute top-3 right-3 w-6 h-6 border-r-2 border-t-2 border-white/50"
        animate={{ opacity: [0.5, 1, 0.5] }}
        transition={{ duration: 1.5, repeat: Infinity, delay: 0.2 }}
      />
      <motion.div
        className="absolute bottom-3 left-3 w-6 h-6 border-l-2 border-b-2 border-white/50"
        animate={{ opacity: [0.5, 1, 0.5] }}
        transition={{ duration: 1.5, repeat: Infinity, delay: 0.4 }}
      />
      <motion.div
        className="absolute bottom-3 right-3 w-6 h-6 border-r-2 border-b-2 border-white/50"
        animate={{ opacity: [0.5, 1, 0.5] }}
        transition={{ duration: 1.5, repeat: Infinity, delay: 0.6 }}
      />

      {/* Floating particles */}
      {[...Array(6)].map((_, i) => (
        <motion.div
          key={i}
          className="absolute w-1 h-1 bg-white/60 rounded-full"
          style={{
            left: `${20 + i * 12}%`,
            top: '50%',
          }}
          animate={{
            y: [-20, 20, -20],
            opacity: [0.3, 0.8, 0.3],
          }}
          transition={{
            duration: 2 + i * 0.3,
            repeat: Infinity,
            delay: i * 0.2,
          }}
        />
      ))}
    </div>
  );
}
