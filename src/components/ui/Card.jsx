function Card({ children, className = '', ...props }) {
  return (
    <div
      className={`bg-white border border-[#e4e5e9] rounded-[10px] ${className}`}
      {...props}
    >
      {children}
    </div>
  )
}

export default Card