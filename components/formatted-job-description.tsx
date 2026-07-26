import DOMPurify from "dompurify";
import { useEffect, useMemo, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface FormattedJobDescriptionProps {
	descriptionHtml?: string;
	descriptionText?: string;
	collapsible?: boolean;
	collapsedHeightClassName?: string;
}

const COLLAPSED_MAX_HEIGHT_PX = 256;

const ALLOWED_TAGS = [
	"p",
	"div",
	"span",
	"br",
	"ul",
	"ol",
	"li",
	"strong",
	"b",
	"em",
	"i",
	"u",
	"a",
	"h1",
	"h2",
	"h3",
	"h4",
	"blockquote",
	"pre",
	"code",
];

export function FormattedJobDescription({
	descriptionHtml,
	descriptionText,
	collapsible = false,
	collapsedHeightClassName = "max-h-64",
}: FormattedJobDescriptionProps) {
	const [isExpanded, setIsExpanded] = useState(false);
	const [showToggle, setShowToggle] = useState(false);
	const contentRef = useRef<HTMLDivElement | null>(null);
	const safeHtml = useMemo(() => {
		if (!descriptionHtml) {
			return "";
		}

		return DOMPurify.sanitize(descriptionHtml, {
			ALLOWED_TAGS,
			ALLOWED_ATTR: ["href", "title"],
			ALLOW_DATA_ATTR: false,
		});
	}, [descriptionHtml]);

	useEffect(() => {
		if (!collapsible) {
			setShowToggle(false);
			return;
		}

		const element = contentRef.current;

		if (!element) {
			return;
		}

		const measureOverflow = () => {
			const hasOverflow = element.scrollHeight > COLLAPSED_MAX_HEIGHT_PX + 4;
			setShowToggle(hasOverflow);

			if (!hasOverflow) {
				setIsExpanded(false);
			}
		};

		measureOverflow();

		if (typeof ResizeObserver === "undefined") {
			window.addEventListener("resize", measureOverflow);

			return () => {
				window.removeEventListener("resize", measureOverflow);
			};
		}

		const observer = new ResizeObserver(() => {
			measureOverflow();
		});

		observer.observe(element);
		window.addEventListener("resize", measureOverflow);

		return () => {
			observer.disconnect();
			window.removeEventListener("resize", measureOverflow);
		};
	}, [collapsible, descriptionHtml, descriptionText]);

	const baseClassName =
		"applynza-job-description text-[13px] leading-[1.65] text-muted-foreground break-words " +
		"[&_p]:mb-3 [&_p:last-child]:mb-0 [&_h1]:mb-2 [&_h1]:mt-4 [&_h1]:text-lg [&_h1]:font-semibold [&_h1]:text-foreground " +
		"[&_h2]:mb-2 [&_h2]:mt-4 [&_h2]:text-base [&_h2]:font-semibold [&_h2]:text-foreground " +
		"[&_h3]:mb-2 [&_h3]:mt-4 [&_h3]:text-sm [&_h3]:font-semibold [&_h3]:text-foreground " +
		"[&_h4]:mb-2 [&_h4]:mt-4 [&_h4]:text-sm [&_h4]:font-semibold [&_h4]:text-foreground " +
		"[&_h1:first-child]:mt-0 [&_h2:first-child]:mt-0 [&_h3:first-child]:mt-0 [&_h4:first-child]:mt-0 " +
		"[&_ul]:mb-3 [&_ul]:mt-2 [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:mb-3 [&_ol]:mt-2 [&_ol]:list-decimal [&_ol]:pl-5 " +
		"[&_li]:mb-1 [&_strong]:font-semibold [&_strong]:text-foreground [&_b]:font-semibold [&_b]:text-foreground " +
		"[&_a]:text-primary [&_a:hover]:underline [&_blockquote]:my-3 [&_blockquote]:border-l-[3px] [&_blockquote]:border-border [&_blockquote]:pl-3 " +
		"[&_pre]:overflow-x-auto [&_pre]:whitespace-pre-wrap [&_code]:font-mono [&_code]:text-[12px]";

	const content = safeHtml ? (
		<div
			className={baseClassName}
			dangerouslySetInnerHTML={{ __html: safeHtml }}
		/>
	) : (
		<div className={`${baseClassName} whitespace-pre-wrap`}>
			{descriptionText || "No description available."}
		</div>
	);

	if (!collapsible) {
		return content;
	}

	return (
		<div className="relative">
			<div
				ref={contentRef}
				className={cn(
					"overflow-hidden transition-[max-height] duration-300 ease-out",
					!isExpanded && showToggle && "pb-9",
					!isExpanded && showToggle && collapsedHeightClassName,
				)}
				style={
					!isExpanded && showToggle
						? { maxHeight: `${COLLAPSED_MAX_HEIGHT_PX}px` }
						: undefined
				}
			>
				{content}
			</div>
			{!isExpanded && showToggle ? (
				<div className="pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-white via-white/82 via-25% to-transparent dark:from-[#2a2020] dark:via-[#2a2020]/78 dark:via-25% dark:to-transparent" />
			) : null}
			{showToggle ? (
				<div
					className={cn(
						"relative z-10 flex",
						!isExpanded
							? "absolute inset-x-0 bottom-0 justify-center pb-0.5"
							: "mt-3 justify-start",
					)}
				>
					<Button
						type="button"
						variant="ghost"
						className={cn(
							"h-7 rounded-full px-3 text-[12px] font-medium text-foreground shadow-none",
							"border border-slate-100 bg-white/96 hover:bg-white",
							"dark:border-white/10 dark:bg-[#382b2b]/92 dark:text-slate-100 dark:hover:bg-[#403131]",
							"backdrop-blur-md",
						)}
						onClick={() => setIsExpanded((current) => !current)}
					>
						{isExpanded ? "Show less" : "Show more"}
					</Button>
				</div>
			) : null}
		</div>
	);
}
