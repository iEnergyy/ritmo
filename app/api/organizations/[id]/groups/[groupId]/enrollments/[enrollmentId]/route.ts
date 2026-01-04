import { NextRequest, NextResponse } from "next/server";
import {
	getAuthenticatedSession,
	enforceTenantIsolation,
} from "@/lib/api-helpers";
import {
	getEnrollmentsByGroup,
	updateEnrollment,
	endEnrollment,
} from "@/db/queries/student-groups";
import { getGroupById } from "@/db/queries/groups";
import { eq, and } from "drizzle-orm";
import { studentGroups } from "@/db/schema";
import { db } from "@/db";

/**
 * GET /api/organizations/[id]/groups/[groupId]/enrollments/[enrollmentId]
 * Get a specific enrollment
 */
export async function GET(
	request: NextRequest,
	{
		params,
	}: {
		params: Promise<{ id: string; groupId: string; enrollmentId: string }>;
	},
) {
	try {
		const { id: organizationId, groupId, enrollmentId } = await params;
		const session = await getAuthenticatedSession(request);

		// Verify user has access to this organization
		await enforceTenantIsolation(organizationId, session.user.id);

		// Verify group exists and belongs to organization
		const group = await getGroupById(organizationId, groupId);
		if (!group) {
			return NextResponse.json({ error: "Group not found" }, { status: 404 });
		}

		// Get all enrollments and find the specific one
		const enrollments = await getEnrollmentsByGroup(groupId, organizationId);
		const enrollment = enrollments.find((e) => e.id === enrollmentId);

		if (!enrollment) {
			return NextResponse.json(
				{ error: "Enrollment not found" },
				{ status: 404 },
			);
		}

		return NextResponse.json({ enrollment });
	} catch (error) {
		if (error instanceof NextResponse) {
			return error;
		}
		console.error("Error fetching enrollment:", error);
		return NextResponse.json(
			{ error: "Internal server error" },
			{ status: 500 },
		);
	}
}

/**
 * PATCH /api/organizations/[id]/groups/[groupId]/enrollments/[enrollmentId]
 * Update enrollment dates
 */
export async function PATCH(
	request: NextRequest,
	{
		params,
	}: {
		params: Promise<{ id: string; groupId: string; enrollmentId: string }>;
	},
) {
	try {
		const { id: organizationId, groupId, enrollmentId } = await params;
		const session = await getAuthenticatedSession(request);

		// Verify user has access to this organization
		await enforceTenantIsolation(organizationId, session.user.id);

		const body = await request.json();
		const { startDate, endDate } = body;

		// Verify group exists and belongs to organization
		const group = await getGroupById(organizationId, groupId);
		if (!group) {
			return NextResponse.json({ error: "Group not found" }, { status: 404 });
		}

		// Get enrollment
		const enrollments = await getEnrollmentsByGroup(groupId, organizationId);
		const existingEnrollment = enrollments.find((e) => e.id === enrollmentId);

		if (!existingEnrollment) {
			return NextResponse.json(
				{ error: "Enrollment not found" },
				{ status: 404 },
			);
		}

		// Validate dates
		const finalStartDate = startDate || existingEnrollment.startDate;
		const finalEndDate =
			endDate !== undefined ? endDate : existingEnrollment.endDate;

		if (finalEndDate && finalEndDate < finalStartDate) {
			return NextResponse.json(
				{ error: "End date must be after start date" },
				{ status: 400 },
			);
		}

		// Update enrollment
		const updatedEnrollment = await updateEnrollment(
			enrollmentId,
			existingEnrollment,
			{
				startDate,
				endDate,
			},
		);

		return NextResponse.json({ enrollment: updatedEnrollment });
	} catch (error) {
		if (error instanceof NextResponse) {
			return error;
		}
		console.error("Error updating enrollment:", error);
		return NextResponse.json(
			{ error: "Internal server error" },
			{ status: 500 },
		);
	}
}

/**
 * DELETE /api/organizations/[id]/groups/[groupId]/enrollments/[enrollmentId]
 * End enrollment (set endDate)
 */
export async function DELETE(
	request: NextRequest,
	{
		params,
	}: {
		params: Promise<{ id: string; groupId: string; enrollmentId: string }>;
	},
) {
	try {
		const { id: organizationId, groupId, enrollmentId } = await params;
		const session = await getAuthenticatedSession(request);

		// Verify user has access to this organization
		await enforceTenantIsolation(organizationId, session.user.id);

		// Verify group exists and belongs to organization
		const group = await getGroupById(organizationId, groupId);
		if (!group) {
			return NextResponse.json({ error: "Group not found" }, { status: 404 });
		}

		// Get enrollment
		const enrollments = await getEnrollmentsByGroup(groupId, organizationId);
		const existingEnrollment = enrollments.find((e) => e.id === enrollmentId);

		if (!existingEnrollment) {
			return NextResponse.json(
				{ error: "Enrollment not found" },
				{ status: 404 },
			);
		}

		// Get end date from query params or use today
		const searchParams = request.nextUrl.searchParams;
		const endDate =
			searchParams.get("endDate") || new Date().toISOString().split("T")[0];

		// End enrollment
		const updatedEnrollment = await endEnrollment(enrollmentId, endDate);

		return NextResponse.json({
			enrollment: updatedEnrollment,
			message: "Enrollment ended successfully",
		});
	} catch (error) {
		if (error instanceof NextResponse) {
			return error;
		}
		console.error("Error ending enrollment:", error);
		return NextResponse.json(
			{ error: "Internal server error" },
			{ status: 500 },
		);
	}
}

