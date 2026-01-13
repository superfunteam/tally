import { useState, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface DropZoneProps {
  accept: string;
  multiple?: boolean;
  icon: string;
  title: string;
  subtitle: string;
  onFiles: (files: File[]) => void;
  disabled?: boolean;
}

export function DropZone({
  accept,
  multiple = true,
  icon,
  title,
  subtitle,
  onFiles,
  disabled = false,
}: DropZoneProps) {
  const [isDragging, setIsDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!disabled) setIsDragging(true);
  }, [disabled]);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);

      if (disabled) return;

      const files = Array.from(e.dataTransfer.files);
      if (files.length > 0) {
        onFiles(files);
      }
    },
    [disabled, onFiles]
  );

  const handleClick = useCallback(() => {
    if (!disabled) {
      inputRef.current?.click();
    }
  }, [disabled]);

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = Array.from(e.target.files || []);
      if (files.length > 0) {
        onFiles(files);
      }
      // Reset input so same file can be selected again
      e.target.value = '';
    },
    [onFiles]
  );

  return (
    <motion.div
      className={`
        drop-zone relative overflow-hidden
        ${isDragging ? 'drop-zone-active' : ''}
        ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
      `}
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      onClick={handleClick}
      whileHover={disabled ? {} : { scale: 1.01 }}
      whileTap={disabled ? {} : { scale: 0.99 }}
    >
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        multiple={multiple}
        onChange={handleInputChange}
        className="hidden"
        disabled={disabled}
      />

      <AnimatePresence>
        {isDragging && (
          <motion.div
            className="absolute inset-0 bg-primary-500/10 rounded-2xl"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          />
        )}
      </AnimatePresence>

      <motion.span
        className="material-icons-outlined text-5xl"
        style={{ color: 'var(--text-muted)' }}
        animate={isDragging ? { scale: 1.2, color: 'var(--color-primary-600)' } : { scale: 1 }}
      >
        {icon}
      </motion.span>

      <div className="text-center">
        <p className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>{title}</p>
        <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>{subtitle}</p>
      </div>
    </motion.div>
  );
}
