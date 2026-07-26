import { useEffect, useState } from "react";

import { getAppVersionLabel } from "@/lib/app-version";
import { cn } from "@/lib/utils";

const DASHBOARD_IDENTITY_STORAGE_KEY = "applynza.dashboardIdentity";
const LEGACY_DASHBOARD_IDENTITY_STORAGE_KEY = "applypilot.dashboardIdentity";

const dashboardIdentities = [
	"Orion Nova",
	"Luna Astra",
	"Vega Starborn",
	"Sirius Ray",
	"Nova Celeste",
	"Atlas Moon",
	"Lyra Comet",
	"Cosmo Vale",
	"Sol Orion",
	"Nebula Kai",
	"Titan Skye",
	"Elara Star",
	"Apollo Zenith",
	"Mira Galaxy",
	"Astra Solis",
] as const;

const avatarThemes = [
	"from-violet-500 via-primary to-indigo-700",
	"from-sky-500 via-cyan-500 to-blue-700",
	"from-fuchsia-500 via-violet-500 to-indigo-700",
	"from-amber-400 via-orange-500 to-rose-500",
	"from-emerald-400 via-teal-500 to-cyan-600",
] as const;

type DashboardIdentityName = (typeof dashboardIdentities)[number];

type UserIdentity = {
	name: DashboardIdentityName;
	role: string;
	avatarLabel: string;
	avatarThemeClassName: string;
	version: string;
};

function buildUserIdentity(
	name: DashboardIdentityName,
	version = getExtensionVersionLabel(),
): UserIdentity {
	const avatarLabel = name
		.split(" ")
		.slice(0, 2)
		.map((part) => part[0] ?? "")
		.join("")
		.toUpperCase();
	const avatarThemeClassName =
		avatarThemes[
			dashboardIdentities.findIndex((identity) => identity === name) %
				avatarThemes.length
		];

	return {
		name,
		role: "Local workspace",
		avatarLabel,
		avatarThemeClassName,
		version,
	};
}

function getRandomDashboardIdentityName() {
	return dashboardIdentities[
		Math.floor(Math.random() * dashboardIdentities.length)
	];
}

function getExtensionVersionLabel() {
	return getAppVersionLabel();
}

export function useUserIdentity() {
	const [userIdentity, setUserIdentity] = useState<UserIdentity>(() =>
		buildUserIdentity(dashboardIdentities[0]),
	);

	useEffect(() => {
		let isMounted = true;

		async function loadUserIdentity() {
			const stored = await browser.storage.local.get([
				DASHBOARD_IDENTITY_STORAGE_KEY,
				LEGACY_DASHBOARD_IDENTITY_STORAGE_KEY,
			]);
			const storedName =
				stored[DASHBOARD_IDENTITY_STORAGE_KEY] ??
				stored[LEGACY_DASHBOARD_IDENTITY_STORAGE_KEY];
			const validStoredName = dashboardIdentities.find(
				(identity) => identity === storedName,
			);
			const identityName = validStoredName ?? getRandomDashboardIdentityName();

			if (!validStoredName) {
				await browser.storage.local.set({
					[DASHBOARD_IDENTITY_STORAGE_KEY]: identityName,
					[LEGACY_DASHBOARD_IDENTITY_STORAGE_KEY]: identityName,
				});
			}

			if (isMounted) {
				setUserIdentity(buildUserIdentity(identityName));
			}
		}

		void loadUserIdentity();

		return () => {
			isMounted = false;
		};
	}, []);

	return userIdentity;
}

type UserIdentityBadgeProps = {
	className?: string;
	identity?: UserIdentity;
	labelClassName?: string;
};

export function UserIdentityBadge({
	className,
	identity,
	labelClassName,
}: UserIdentityBadgeProps) {
	const userIdentity = identity ?? useUserIdentity();

	return (
		<div
			className={cn(
				"flex size-10 shrink-0 items-center justify-center rounded-full bg-linear-to-br text-xs font-black text-white shadow-[0_10px_24px_color-mix(in_srgb,var(--primary)_28%,transparent)]",
				userIdentity.avatarThemeClassName,
				className,
			)}
		>
			<span className={labelClassName}>{userIdentity.avatarLabel}</span>
		</div>
	);
}
