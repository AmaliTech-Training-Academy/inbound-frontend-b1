// THE FIX: Add isDanger to the props
export default function ProgressRing({ percentage, isDanger }) {
    const radius = 28;
    const strokeWidth = 3;
    const normalizedRadius = radius - strokeWidth * 2;
    const circumference = normalizedRadius * 2 * Math.PI;
    const strokeDashoffset = circumference - (percentage / 100) * circumference;

    const colorClass = isDanger ? "text-danger" : "text-ink";

    return (
        <div className="relative flex items-center justify-center">
            <svg
                height={radius * 2}
                width={radius * 2}
                className="rotate-[-90deg]">
                <circle
                    stroke="#f1f5f9"
                    fill="transparent"
                    strokeWidth={strokeWidth}
                    r={normalizedRadius}
                    cx={radius}
                    cy={radius}
                />
                <circle
                    stroke="currentColor"
                    fill="transparent"
                    strokeWidth={strokeWidth}
                    strokeDasharray={circumference + " " + circumference}
                    style={{
                        strokeDashoffset,
                        transition: "stroke-dashoffset 1s linear",
                    }}
                    r={normalizedRadius}
                    cx={radius}
                    cy={radius}
                    className={`transition-colors duration-500 ${colorClass}`}
                />
            </svg>

            <span
                className={`absolute font-mono text-xs font-bold transition-colors duration-500 ${colorClass}`}>
                {Math.round(percentage)}%
            </span>
        </div>
    );
}
