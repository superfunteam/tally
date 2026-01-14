import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface ScanningOverlayProps {
  status: 'pending' | 'uploading' | 'analyzing' | 'extracting';
}

// Witty, conversational messages that feel like someone's talking to you
const messages: Record<string, string[]> = {
  pending: [
    "One sec, grabbing my reading glasses...",
    "In line behind some other receipts...",
    "Warming up the ol' brain cells...",
    "Almost your turn!",
  ],
  uploading: [
    "Got it, sending this over...",
    "Uploading your crinkled treasure...",
    "Beaming it up...",
    "Almost there, don't blink...",
  ],
  analyzing: [
    "Okay, let's see what we've got here...",
    "Squinting at the fine print...",
    "Hmm, interesting purchase...",
    "No judgment on the snacks btw",
    "Deciphering that cashier's handwriting...",
    "Is that a 7 or a 1? Let me look closer...",
    "Reading between the lines...",
    "Finding all the important bits...",
    "Almost got it figured out...",
  ],
  extracting: [
    "Pulling out the numbers...",
    "Crunching the digits...",
    "Double-checking the math...",
    "Just dotting the i's...",
    "Wrapping this up nicely...",
  ],
};

export function ScanningOverlay({ status }: ScanningOverlayProps) {
  const [messageIndex, setMessageIndex] = useState(0);
  const [displayedText, setDisplayedText] = useState('');
  const [isTyping, setIsTyping] = useState(true);

  const currentMessages = messages[status];
  const currentMessage = currentMessages[messageIndex % currentMessages.length];

  // Typing effect
  useEffect(() => {
    setDisplayedText('');
    setIsTyping(true);
    let index = 0;

    const typeInterval = setInterval(() => {
      if (index < currentMessage.length) {
        setDisplayedText(currentMessage.slice(0, index + 1));
        index++;
      } else {
        setIsTyping(false);
        clearInterval(typeInterval);
      }
    }, 35); // typing speed

    return () => clearInterval(typeInterval);
  }, [currentMessage]);

  // Cycle through messages
  useEffect(() => {
    const interval = setInterval(() => {
      setMessageIndex((prev) => prev + 1);
    }, 3000);
    return () => clearInterval(interval);
  }, [status]);

  return (
    <div className="absolute inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="text-center">
        <AnimatePresence mode="wait">
          <motion.p
            key={currentMessage}
            className="text-white text-base font-medium leading-relaxed"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
          >
            {displayedText}
            {isTyping && (
              <motion.span
                className="inline-block w-0.5 h-4 bg-white ml-0.5 align-middle"
                animate={{ opacity: [1, 0] }}
                transition={{ duration: 0.5, repeat: Infinity }}
              />
            )}
          </motion.p>
        </AnimatePresence>
      </div>
    </div>
  );
}
