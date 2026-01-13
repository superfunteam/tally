import { useRef } from 'react';
import { motion } from 'framer-motion';

interface CameraButtonProps {
  onCapture: (files: File[]) => void;
  variant?: 'primary' | 'secondary';
  className?: string;
}

export function CameraButton({
  onCapture,
  variant = 'primary',
  className = '',
}: CameraButtonProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleClick = () => {
    inputRef.current?.click();
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length > 0) {
      onCapture(files);
    }
    // Reset input so same file can be selected again
    e.target.value = '';
  };

  const variantClasses = {
    primary: 'bg-primary-600 text-white hover:bg-primary-700 shadow-lg shadow-primary-500/25',
    secondary: 'bg-slate-200 text-slate-800 hover:bg-slate-300',
  };

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleChange}
        className="hidden"
      />
      <motion.button
        className={`
          inline-flex items-center justify-center gap-2 px-6 py-3
          font-semibold rounded-xl transition-colors min-h-[48px]
          ${variantClasses[variant]}
          ${className}
        `}
        onClick={handleClick}
        whileTap={{ scale: 0.95 }}
      >
        <span className="material-icons-outlined text-xl">photo_camera</span>
        Take Photo
      </motion.button>
    </>
  );
}
