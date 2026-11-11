import { ConfirmDialog } from "@/components/confirm-dialog";

type SignOutConfirmDialogProps = {
	open: boolean;
	isConfirming: boolean;
	onOpenChange: (open: boolean) => void;
	onConfirm: () => void;
};

export function SignOutConfirmDialog({
	open,
	isConfirming,
	onOpenChange,
	onConfirm,
}: SignOutConfirmDialogProps) {
	return (
		<ConfirmDialog
			open={open}
			title="Sign out of Applynza?"
			description="Your synced data stored on this device will be removed. Your data will remain safely stored in your account and will be available when you sign in again."
			confirmLabel="Sign out"
			cancelLabel="Cancel"
			confirmingLabel="Signing out..."
			isConfirming={isConfirming}
			onOpenChange={onOpenChange}
			onConfirm={onConfirm}
		/>
	);
}
