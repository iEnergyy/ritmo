"use client";

import * as React from "react";
import { useForm as useReactHookForm } from "react-hook-form";
import type { UseFormProps, UseFormReturn } from "react-hook-form";

// Re-export react-hook-form's useForm for convenience
export function useForm<T extends Record<string, any>>(
	props?: UseFormProps<T>,
): UseFormReturn<T> {
	return useReactHookForm<T>(props);
}

// Form component wrapper
export function Form({
	children,
	onSubmit,
	...props
}: React.ComponentProps<"form"> & {
	onSubmit?: (e: React.FormEvent<HTMLFormElement>) => void;
}) {
	return (
		<form onSubmit={onSubmit} {...props}>
			{children}
		</form>
	);
}
