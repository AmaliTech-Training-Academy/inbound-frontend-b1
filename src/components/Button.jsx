function Button({
  children,
  onClick,
  variant = 'dark',
  className = '',
  type = 'button',
  disabled = false,
  ...props
}) {
  const baseStyles =
    'inline-flex items-center justify-center font-medium transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed rounded-[6px] text-xs sm:text-sm select-none'

  let variantStyles = 'bg-dark-btn text-surface hover:bg-dark-btn-hover px-3.5 py-1.5'

  if (variant === 'light' || variant === 'secondary') {
    variantStyles =
      'bg-surface border border-border-default text-text-primary hover:bg-page px-3 py-1.5'
  } else if (variant === 'danger') {
    variantStyles =
      'bg-surface border border-danger text-danger hover:bg-danger/10 px-3 py-1.5'
  } else if (variant === 'chip') {
    variantStyles =
      'bg-chip text-text-primary hover:bg-border-default px-2.5 py-1 rounded-[4px]'
  } else if (variant === 'icon') {
    variantStyles =
      'w-8 h-8 p-0 bg-surface border border-border-default text-text-secondary hover:text-text-primary hover:bg-page rounded-[6px]'
  }

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`${baseStyles} ${variantStyles} ${className}`}
      {...props}
    >
      {children}
    </button>
  )
}

export default Button