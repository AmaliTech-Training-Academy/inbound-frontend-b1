function Card({ children, className = "", ...props }) {
    return (
        <div
            className={`rounded-[10px] border border-line bg-surface ${className}`}
            {...props}>
            {children}
        </div>
    );
}

export default Card;
