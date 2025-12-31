import { NextRequest, NextResponse } from "next/server";
import {
	getAuthenticatedSession,
	enforceTenantIsolation,
} from "@/lib/api-helpers";
import {
	getTeachersByOrganization,
	createTeacher,
	isUserMemberOfOrganization,
} from "@/db/queries/teachers";

/**
 * GET /api/organizations/[id]/teachers
 * List all teachers for an organization
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

		// Fetch teachers with user info if linked
		const teachersList = await getTeachersByOrganization(organizationId);

		return NextResponse.json({ teachers: teachersList });
	} catch (error) {
		if (error instanceof NextResponse) {
			return error;
		}
		console.error("Error fetching teachers:", error);
		return NextResponse.json(
			{ error: "Internal server error" },
			{ status: 500 },
		);
	}
}

/**
 * POST /api/organizations/[id]/teachers
 * Create a new teacher
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
		const {
			fullName,
			userId,
			paymentType,
			monthlyRate,
			ratePerHead,
			ratePerClass,
		} = body;

		if (!fullName) {
			return NextResponse.json(
				{ error: "Full name is required" },
				{ status: 400 },
			);
		}

		if (!paymentType) {
			return NextResponse.json(
				{ error: "Payment type is required" },
				{ status: 400 },
			);
		}

		const validPaymentTypes = ["fixed_monthly", "per_head", "per_class"];
		if (!validPaymentTypes.includes(paymentType)) {
			return NextResponse.json(
				{ error: `Payment type must be one of: ${validPaymentTypes.join(", ")}` },
				{ status: 400 },
			);
		}

		// Validate rate based on payment type
		if (paymentType === "fixed_monthly" && !monthlyRate) {
			return NextResponse.json(
				{ error: "Monthly rate is required for fixed monthly payment type" },
				{ status: 400 },
			);
		}
		if (paymentType === "per_head" && !ratePerHead) {
			return NextResponse.json(
				{ error: "Rate per head is required for per head payment type" },
				{ status: 400 },
			);
		}
		if (paymentType === "per_class" && !ratePerClass) {
			return NextResponse.json(
				{ error: "Rate per class is required for per class payment type" },
				{ status: 400 },
			);
		}

		// If userId is provided, verify the user is a member of the organization
		if (userId) {
			const isMember = await isUserMemberOfOrganization(
				userId,
				organizationId,
			);

			if (!isMember) {
				return NextResponse.json(
					{ error: "User must be a member of the organization" },
					{ status: 400 },
				);
			}
		}

		// Create teacher
		const newTeacher = await createTeacher({
			organizationId,
			fullName,
			userId: userId || null,
			paymentType,
			monthlyRate: monthlyRate || null,
			ratePerHead: ratePerHead || null,
			ratePerClass: ratePerClass || null,
		});

		return NextResponse.json({ teacher: newTeacher }, { status: 201 });
	} catch (error) {
		if (error instanceof NextResponse) {
			return error;
		}
		console.error("Error creating teacher:", error);
		return NextResponse.json(
			{ error: "Internal server error" },
			{ status: 500 },
		);
	}
}

