// Size lives in `size`, not in a className override: `h-8` and `h-11` are the
// same utility family, so which one wins depends on stylesheet order rather
// than on the order they are written in the class attribute.

const SIZES = {
    md: "h-8 px-3.5 gap-1.5 text-xs sm:text-sm",
    lg: "h-11 px-6.25 gap-2 text-base",
};

const VARIANTS = {
    dark: "bg-dark-btn text-surface hover:bg-dark-btn-hover",
    light: "bg-surface border border-border-default text-text-primary hover:bg-page",
    danger: "bg-surface border border-danger text-danger hover:bg-danger/10",
    chip: "h-8 px-2.5 gap-1.5 text-xs sm:text-sm bg-chip text-text-primary hover:bg-border-default",
    icon: "h-8 w-8 p-0 bg-surface border border-border-default text-text-secondary hover:text-text-primary hover:bg-page",
};

function Button({
    children,
    onClick,
    variant = "dark",
    size = "md",
    className = "",
    type = "button",
    disabled = false,
    ...props
}) {
    // "secondary" is the older name for "light"; kept so either reads correctly.
    const styles =
        VARIANTS[variant] ??
        (variant === "secondary" ? VARIANTS.light : VARIANTS.dark);

    // chip and icon carry their own box, so a size would only fight them.
    const boxed = variant === "chip" || variant === "icon";
    const sizing = boxed ? "" : SIZES[size];

    const radius = boxed ? "rounded-[6px]" : "rounded-[8px]";

    return (
        <button
            type={type}
            onClick={onClick}
            disabled={disabled}
            className={`inline-flex cursor-pointer select-none items-center justify-center font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${radius} ${sizing} ${styles} ${className}`}
            {...props}>
            {children}
        </button>
    );
}

export default Button;
