import { NextRequest, NextResponse } from "next/server";
import {
	getAuthenticatedSession,
	enforceTenantIsolation,
} from "@/lib/api-helpers";
import {
	getStudentsByOrganization,
	createStudent,
} from "@/db/queries/students";

/**
 * GET /api/organizations/[id]/students
 * List all students for an organization with optional search
 */
export async function GET(
	request: NextRequest,
	{ params }: { params: Promise<{ id: string }> },
) {
	try {
		const { id: organizationId } = await params;
		const session = await getAuthenticatedSession(request);

		// Verify user has access to this organization
		await enforceTenantIsolation(organizationId, session.user.id);

		// Get search query from URL params
		const searchParams = request.nextUrl.searchParams;
		const search = searchParams.get("search");

		const studentsList = await getStudentsByOrganization(
			organizationId,
			search || undefined,
		);

		return NextResponse.json({ students: studentsList });
	} catch (error) {
		if (error instanceof NextResponse) {
			return error;
		}
		console.error("Error fetching students:", error);
		return NextResponse.json(
			{ error: "Internal server error" },
			{ status: 500 },
		);
	}
}

/**
 * POST /api/organizations/[id]/students
 * Create a new student
 */
export async function POST(
	request: NextRequest,
	{ params }: { params: Promise<{ id: string }> },
) {
	try {
		const { id: organizationId } = await params;
		const session = await getAuthenticatedSession(request);

		// Verify user has access to this organization
		await enforceTenantIsolation(organizationId, session.user.id);

		const body = await request.json();
		const { fullName, email, phone } = body;

		if (!fullName) {
			return NextResponse.json(
				{ error: "Full name is required" },
				{ status: 400 },
			);
		}

		// Create student
		const newStudent = await createStudent({
			organizationId,
			fullName,
			email: email || null,
			phone: phone || null,
		});

		return NextResponse.json({ student: newStudent }, { status: 201 });
	} catch (error) {
		if (error instanceof NextResponse) {
			return error;
		}
		console.error("Error creating student:", error);
		return NextResponse.json(
			{ error: "Internal server error" },
			{ status: 500 },
		);
	}
}
