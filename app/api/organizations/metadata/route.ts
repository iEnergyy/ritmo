import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth/better-auth";
import { db } from "@/db";
import { organizationMetadata } from "@/db/schema";
import { eq, inArray } from "drizzle-orm";

export async function GET(request: NextRequest) {
	try {
		// Get the session to verify the user is authenticated
		const session = await auth.api.getSession({ headers: request.headers });

		if (!session?.user) {
			return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
		}

		const searchParams = request.nextUrl.searchParams;
		const ids = searchParams.get("ids");

		if (!ids) {
			return NextResponse.json(
				{ error: "ids parameter is required" },
				{ status: 400 },
			);
		}

		const orgIds = ids.split(",").filter(Boolean);

		if (orgIds.length === 0) {
			return NextResponse.json({ types: {} });
		}

		// Fetch organization types
		const metadata = await db
			.select()
			.from(organizationMetadata)
			.where(inArray(organizationMetadata.organizationId, orgIds));

		const types: Record<string, string> = {};
		metadata.forEach((meta) => {
			types[meta.organizationId] = meta.type;
		});

		return NextResponse.json({ types });
	} catch (error) {
		console.error("Error fetching organization metadata:", error);
		return NextResponse.json(
			{ error: "Internal server error" },
			{ status: 500 },
		);
	}
}

export async function POST(request: NextRequest) {
	try {
		// Get the session to verify the user is authenticated
		const session = await auth.api.getSession({ headers: request.headers });

		if (!session?.user) {
			return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
		}

		const body = await request.json();
		const { organizationId, type } = body;

		if (!organizationId || !type) {
			return NextResponse.json(
				{ error: "organizationId and type are required" },
				{ status: 400 },
			);
		}

		if (type !== "school" && type !== "independent_teacher") {
			return NextResponse.json(
				{ error: 'type must be either "school" or "independent_teacher"' },
				{ status: 400 },
			);
		}

		// Check if metadata already exists
		const existing = await db
			.select()
			.from(organizationMetadata)
			.where(eq(organizationMetadata.organizationId, organizationId))
			.limit(1);

		if (existing.length > 0) {
			// Update existing metadata
			await db
				.update(organizationMetadata)
				.set({ type })
				.where(eq(organizationMetadata.organizationId, organizationId));
		} else {
			// Insert new metadata
			await db.insert(organizationMetadata).values({
				organizationId,
				type,
			});
		}

		return NextResponse.json({ success: true });
	} catch (error) {
		console.error("Error setting organization metadata:", error);
		return NextResponse.json(
			{ error: "Internal server error" },
			{ status: 500 },
		);
	}
}
