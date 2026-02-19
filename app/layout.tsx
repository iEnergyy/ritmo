import type { Metadata, Viewport } from "next";

export const metadata: Metadata = {
	title: "Ritmo",
	description: "Cadence - Multi-tenant CRM for dance schools",
};

export const viewport: Viewport = {
	width: "device-width",
	initialScale: 1,
	maximumScale: 5,
};

export default function RootLayout({
	children,
}: Readonly<{
	children: React.ReactNode;
}>) {
	return children;
}
