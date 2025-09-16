// Types for ResourceList component
export type Column = {
	key: string;
	label: string;
	type?: 'text' | 'badge' | 'date' | 'actions' | 'editable';
	editableOptions?: { value: string; label: string }[];
	inlineActions?: InlineAction[];
};

export type InlineAction = {
	action: string;
	icon: string;
	title: string;
	variant?: 'primary' | 'secondary' | 'danger';
	loading?: boolean;
	condition?: (item: Record<string, unknown>) => boolean;
};

export type Action = {
	label: string;
	action: string;
	variant?: 'primary' | 'secondary' | 'danger';
	requiresConfirmation?: boolean;
	loading?: boolean;
	disabled?: boolean;
};
