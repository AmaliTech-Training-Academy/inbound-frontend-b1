export default function ProgressRing({ percentage, isDanger }) {
    // 96x96, the size the design gives the timer ring.
    const radius = 48;
    const strokeWidth = 4;
    // Half the stroke, so the ring's outer edge lands on the viewBox edge.
    const normalizedRadius = radius - strokeWidth / 2;
    const circumference = normalizedRadius * 2 * Math.PI;
    const strokeDashoffset = circumference - (percentage / 100) * circumference;

    const colorClass = isDanger ? "text-danger" : "text-ink";

    return (
        <div className="relative flex items-center justify-center">
            <svg
                height={radius * 2}
                width={radius * 2}
                viewBox={`0 0 ${radius * 2} ${radius * 2}`}
                className="-rotate-90">
                <circle
                    stroke="var(--color-line-cool)"
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
                    strokeLinecap="round"
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
                className={`absolute font-mono text-sm font-bold transition-colors duration-500 ${colorClass}`}>
                {Math.round(percentage)}%
            </span>
        </div>
    );
}
