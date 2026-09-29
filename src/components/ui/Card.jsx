function Card({ children, className = '', ...props }) {
  return (
    <div
      className={`bg-surface border border-line rounded-[12px] ${className}`}
      {...props}
    >
      {children}
    </div>
  )
}

export default Card