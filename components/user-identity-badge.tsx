import { cn } from "@/lib/utils";

type UserIdentityBadgeProps = {
	className?: string;
	labelClassName?: string;
	name: string;
};

function getAvatarLabel(name: string) {
	return name
		.split(" ")
		.slice(0, 2)
		.map((part) => part[0] ?? "")
		.join("")
		.toUpperCase();
}

export function UserIdentityBadge({
	className,
	labelClassName,
	name,
}: UserIdentityBadgeProps) {
	return (
		<div
			className={cn(
				"flex size-10 shrink-0 items-center justify-center rounded-full bg-linear-to-br from-sky-500 via-cyan-500 to-blue-700 text-xs font-black text-white shadow-[0_10px_24px_color-mix(in_srgb,var(--primary)_28%,transparent)]",
				className,
			)}
		>
			<span className={labelClassName}>{getAvatarLabel(name)}</span>
		</div>
	);
}
