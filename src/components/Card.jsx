function Card({ children, className = '', ...props }) {
  return (
    <div
      className={`bg-surface border border-border-default rounded-[10px] ${className}`}
      {...props}
    >
      {children}
    </div>
  )
}

export default Card