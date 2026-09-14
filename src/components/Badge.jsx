function Badge({ children, className = '', ...props }) {
  return (
    <span
      className={`inline-flex items-center font-mono text-xs px-2 py-0.5 rounded-[4px] bg-[#eef0f2] text-[#6b6d73] ${className}`}
      {...props}
    >
      {children}
    </span>
  )
}

export default Badge