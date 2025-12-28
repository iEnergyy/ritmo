import type { Metadata } from "next";

export const metadata: Metadata = {
	title: "Ritmo",
	description: "Cadence - Multi-tenant CRM for dance schools",
};

export default function RootLayout({
	children,
}: Readonly<{
	children: React.ReactNode;
}>) {
	return children;
}
