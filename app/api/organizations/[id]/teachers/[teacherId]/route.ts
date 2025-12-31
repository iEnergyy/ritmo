import { NextRequest, NextResponse } from "next/server";
import {
	getAuthenticatedSession,
	enforceTenantIsolation,
} from "@/lib/api-helpers";
import {
	getTeacherById,
	getTeacherByIdSimple,
	updateTeacher,
	deleteTeacher,
	isUserMemberOfOrganization,
} from "@/db/queries/teachers";

/**
 * GET /api/organizations/[id]/teachers/[teacherId]
 * Get a specific teacher
 */
export async function GET(
	request: NextRequest,
	{ params }: { params: Promise<{ id: string; teacherId: string }> },
) {
	try {
		const { id: organizationId, teacherId } = await params;
		const session = await getAuthenticatedSession(request);

		// Verify user has access to this organization
		await enforceTenantIsolation(organizationId, session.user.id);

		// Fetch teacher with user info if linked
		const teacher = await getTeacherById(organizationId, teacherId);

		if (!teacher) {
			return NextResponse.json({ error: "Teacher not found" }, { status: 404 });
		}

		return NextResponse.json({ teacher });
	} catch (error) {
		if (error instanceof NextResponse) {
			return error;
		}
		console.error("Error fetching teacher:", error);
		return NextResponse.json(
			{ error: "Internal server error" },
			{ status: 500 },
		);
	}
}

/**
 * PATCH /api/organizations/[id]/teachers/[teacherId]
 * Update a teacher
 */
export async function PATCH(
	request: NextRequest,
	{ params }: { params: Promise<{ id: string; teacherId: string }> },
) {
	try {
		const { id: organizationId, teacherId } = await params;
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

		// Verify teacher exists and belongs to organization
		const existingTeacher = await getTeacherByIdSimple(
			organizationId,
			teacherId,
		);

		if (!existingTeacher) {
			return NextResponse.json({ error: "Teacher not found" }, { status: 404 });
		}

		// If userId is provided and different, verify the user is a member
		if (userId !== undefined && userId !== existingTeacher.userId) {
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
		}

		// Validate payment type if provided
		if (paymentType) {
			const validPaymentTypes = ["fixed_monthly", "per_head", "per_class"];
			if (!validPaymentTypes.includes(paymentType)) {
				return NextResponse.json(
					{
						error: `Payment type must be one of: ${validPaymentTypes.join(", ")}`,
					},
					{ status: 400 },
				);
			}
		}

		const finalPaymentType = paymentType ?? existingTeacher.paymentType;

		// Validate rates based on payment type
		if (
			finalPaymentType === "fixed_monthly" &&
			!monthlyRate &&
			!existingTeacher.monthlyRate
		) {
			return NextResponse.json(
				{ error: "Monthly rate is required for fixed monthly payment type" },
				{ status: 400 },
			);
		}
		if (
			finalPaymentType === "per_head" &&
			!ratePerHead &&
			!existingTeacher.ratePerHead
		) {
			return NextResponse.json(
				{ error: "Rate per head is required for per head payment type" },
				{ status: 400 },
			);
		}
		if (
			finalPaymentType === "per_class" &&
			!ratePerClass &&
			!existingTeacher.ratePerClass
		) {
			return NextResponse.json(
				{ error: "Rate per class is required for per class payment type" },
				{ status: 400 },
			);
		}

		// Update teacher
		const updatedTeacher = await updateTeacher(teacherId, existingTeacher, {
			fullName,
			userId,
			paymentType: finalPaymentType,
			monthlyRate,
			ratePerHead,
			ratePerClass,
		});

		return NextResponse.json({ teacher: updatedTeacher });
	} catch (error) {
		if (error instanceof NextResponse) {
			return error;
		}
		console.error("Error updating teacher:", error);
		return NextResponse.json(
			{ error: "Internal server error" },
			{ status: 500 },
		);
	}
}

/**
 * DELETE /api/organizations/[id]/teachers/[teacherId]
 * Delete a teacher
 */
export async function DELETE(
	request: NextRequest,
	{ params }: { params: Promise<{ id: string; teacherId: string }> },
) {
	try {
		const { id: organizationId, teacherId } = await params;
		const session = await getAuthenticatedSession(request);

		// Verify user has access to this organization
		await enforceTenantIsolation(organizationId, session.user.id);

		// Verify teacher exists and belongs to organization
		const existingTeacher = await getTeacherByIdSimple(
			organizationId,
			teacherId,
		);

		if (!existingTeacher) {
			return NextResponse.json({ error: "Teacher not found" }, { status: 404 });
		}

		// Delete teacher
		await deleteTeacher(teacherId);

		return NextResponse.json({ message: "Teacher deleted successfully" });
	} catch (error) {
		if (error instanceof NextResponse) {
			return error;
		}
		console.error("Error deleting teacher:", error);
		return NextResponse.json(
			{ error: "Internal server error" },
			{ status: 500 },
		);
	}
}
