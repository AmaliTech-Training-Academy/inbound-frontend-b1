import Button from "./ui/Button";
import Card from "./ui/Card";
import Badge from "./ui/Badge";
import { CheckCircle, Download, Paperclip } from "./icons/icons.jsx";

const getFileBadgeStyle = (type = "") => {
    switch (type.toUpperCase()) {
        case "PDF":
            return "bg-danger/10 text-danger border-danger/30";
        case "PNG":
        case "JPG":
        case "JPEG":
            return "bg-purple-50 text-purple-700 border-purple-200";
        case "ZIP":
        case "TAR":
            return "bg-amber-50 text-amber-700 border-amber-200";
        default:
            return "bg-chip text-text-secondary border-border-default";
    }
};

function Attachments({
    attachments = [],
    totalAttachmentSize = "",
    scanInfo = "",
    onDownloadAll,
    onDownloadAttachment,
    onViewAttachment,
    variant = "card",
    className = "",
}) {
    if (!attachments || attachments.length === 0) return null;

    const isFullscreen = variant === "fullscreen";
    const Container = isFullscreen ? "section" : Card;
    const containerProps = isFullscreen
        ? {
              "aria-label": "Attachments",
              className:
                  `mt-2 flex flex-col gap-4 border-t border-border-default pt-5 ${className}`.trim(),
          }
        : {
              className: `flex flex-col gap-4 p-6 ${className}`.trim(),
          };

    const HeadingTag = isFullscreen ? "h3" : "h2";

    return (
        <Container {...containerProps}>
            <div
                className={
                    isFullscreen
                        ? "flex items-center justify-between gap-3"
                        : "flex flex-col justify-between gap-3 border-b border-border-default pb-3 sm:flex-row sm:items-center"
                }>
                <div className="flex items-center gap-2">
                    <Paperclip className="h-4 w-4 shrink-0 text-text-primary" />
                    <HeadingTag
                        className={
                            isFullscreen
                                ? "text-sm font-bold text-text-primary"
                                : "text-sm font-bold text-text-primary sm:text-base"
                        }>
                        Attachments
                    </HeadingTag>
                    <Badge className="px-2 py-0.5 font-mono text-[11px]">
                        {attachments.length}{" "}
                        {attachments.length === 1 ? "file" : "files"}
                        {totalAttachmentSize ? ` · ${totalAttachmentSize}` : ""}
                    </Badge>
                </div>

                <Button
                    variant="light"
                    onClick={onDownloadAll}
                    className={isFullscreen ? "" : "self-start sm:self-auto"}
                    aria-label="Download all attachments as zip">
                    <Download className="h-3.5 w-3.5" />
                    <span>
                        {isFullscreen ? "Download All" : "Download All (.zip)"}
                    </span>
                </Button>
            </div>

            <div
                className={
                    isFullscreen
                        ? "grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3"
                        : "grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-3"
                }>
                {attachments.map((att) => (
                    <div
                        key={att.id || att.filename}
                        className={`${
                            isFullscreen ? "bg-surface-subtle" : "bg-surface"
                        } flex min-w-0 flex-col justify-between gap-2.5 rounded-[8px] border border-border-default p-3 transition-colors hover:border-border-strong`}>
                        <div className="flex min-w-0 items-start gap-2.5">
                            <span
                                className={`shrink-0 rounded-[3px] border px-1.5 py-0.5 font-mono text-[10px] font-bold uppercase ${getFileBadgeStyle(
                                    att.type,
                                )}`}>
                                {att.type || "FILE"}
                            </span>
                            <span
                                className="block flex-1 truncate text-xs font-medium text-text-primary"
                                title={att.filename}>
                                {att.filename}
                            </span>
                        </div>

                        <div className="flex items-center justify-between border-t border-page pt-1 text-[11px] text-text-secondary">
                            <span className="font-mono">{att.size || ""}</span>
                            <div
                                className={
                                    isFullscreen
                                        ? "flex items-center gap-2"
                                        : "flex items-center gap-1.5"
                                }>
                                {typeof onViewAttachment === "function" && (
                                    <button
                                        type="button"
                                        onClick={() => onViewAttachment(att)}
                                        className="cursor-pointer font-medium transition-colors hover:text-text-primary">
                                        View
                                    </button>
                                )}
                                <button
                                    type="button"
                                    onClick={() =>
                                        typeof onDownloadAttachment ===
                                            "function" &&
                                        onDownloadAttachment(att)
                                    }
                                    className="inline-flex cursor-pointer items-center gap-1 font-medium transition-colors hover:text-text-primary"
                                    aria-label={`Download ${att.filename}`}>
                                    <Download className="h-3 w-3" />
                                    <span>Download</span>
                                </button>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {scanInfo && !isFullscreen && (
                <div className="mt-2 flex items-center gap-2 border-t border-border-default pt-3 font-mono text-xs text-text-secondary">
                    <CheckCircle className="h-3.5 w-3.5 shrink-0 text-success" />
                    <span>{scanInfo}</span>
                </div>
            )}
        </Container>
    );
}

export default Attachments;
