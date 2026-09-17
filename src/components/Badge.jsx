function Badge({ children, className = '', ...props }) {
  return (
    <span
      className={`inline-flex items-center font-mono text-xs px-2 py-0.5 rounded-[4px] bg-chip text-text-secondary ${className}`}
      {...props}
    >
      {children}
    </span>
  )
}

export default Badge