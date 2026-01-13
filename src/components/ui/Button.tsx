import { forwardRef } from 'react';
import { motion, HTMLMotionProps } from 'framer-motion';

interface ButtonProps extends Omit<HTMLMotionProps<'button'>, 'children'> {
  variant?: 'primary' | 'secondary' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  icon?: string;
  iconPosition?: 'left' | 'right';
  loading?: boolean;
  children?: React.ReactNode;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = 'primary',
      size = 'md',
      icon,
      iconPosition = 'left',
      loading = false,
      disabled,
      className = '',
      children,
      ...props
    },
    ref
  ) => {
    const baseClasses = 'inline-flex items-center justify-center gap-2 font-semibold rounded-xl transition-colors';

    const variantClasses = {
      primary: 'bg-primary-600 text-white hover:bg-primary-700 shadow-lg shadow-primary-500/25',
      secondary: 'bg-slate-200 text-slate-800 hover:bg-slate-300',
      ghost: 'bg-transparent text-slate-600 hover:bg-slate-100',
    };

    const sizeClasses = {
      sm: 'px-4 py-2 text-sm min-h-[40px]',
      md: 'px-6 py-3 text-base min-h-[48px]',
      lg: 'px-8 py-4 text-lg min-h-[56px]',
    };

    const isDisabled = disabled || loading;

    return (
      <motion.button
        ref={ref}
        className={`${baseClasses} ${variantClasses[variant]} ${sizeClasses[size]} ${
          isDisabled ? 'opacity-50 cursor-not-allowed' : ''
        } ${className}`}
        disabled={isDisabled}
        whileTap={isDisabled ? {} : { scale: 0.95 }}
        whileHover={isDisabled ? {} : { scale: 1.02 }}
        {...props}
      >
        {loading ? (
          <span className="material-icons-outlined animate-spin text-xl">sync</span>
        ) : (
          <>
            {icon && iconPosition === 'left' && (
              <span className="material-icons-outlined text-xl">{icon}</span>
            )}
            {children}
            {icon && iconPosition === 'right' && (
              <span className="material-icons-outlined text-xl">{icon}</span>
            )}
          </>
        )}
      </motion.button>
    );
  }
);

Button.displayName = 'Button';
