function Badge({ children, className = "", ...props }) {
    return (
        <span
            className={`inline-flex items-center rounded-[4px] bg-chip px-2 py-0.5 font-mono text-xs text-text-secondary ${className}`}
            {...props}>
            {children}
        </span>
    );
}

export default Badge;
