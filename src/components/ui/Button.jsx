function Button({
    children,
    onClick,
    variant = "dark",
    className = "",
    type = "button",
    disabled = false,
    ...props
}) {
    const baseStyles =
        "inline-flex items-center justify-center font-medium transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed rounded-[6px] text-xs sm:text-sm select-none";

    let variantStyles =
        "bg-[#111111] text-white hover:bg-[#2a2a2a] px-3.5 py-1.5";

    if (variant === "light" || variant === "secondary") {
        variantStyles =
            "bg-white border border-[#e4e5e9] text-[#111213] hover:bg-[#f4f5f7] px-3 py-1.5";
    } else if (variant === "danger") {
        variantStyles =
            "bg-white border border-[#d1293d] text-[#d1293d] hover:bg-[#d1293d]/10 px-3 py-1.5";
    } else if (variant === "chip") {
        variantStyles =
            "bg-[#eef0f2] text-[#111213] hover:bg-[#e4e5e9] px-2.5 py-1 rounded-[4px]";
    } else if (variant === "icon") {
        variantStyles =
            "w-8 h-8 p-0 bg-white border border-[#e4e5e9] text-[#6b6d73] hover:text-[#111213] hover:bg-[#f4f5f7] rounded-[6px]";
    }

    return (
        <button
            type={type}
            onClick={onClick}
            disabled={disabled}
            className={`${baseStyles} ${variantStyles} ${className}`}
            {...props}>
            {children}
        </button>
    );
}

export default Button;
