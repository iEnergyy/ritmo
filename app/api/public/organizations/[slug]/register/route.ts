import { NextRequest, NextResponse } from "next/server";
import { getOrganizationBySlug } from "@/db/queries/organizations";
import { createStudent } from "@/db/queries/students";

/**
 * POST /api/public/organizations/[slug]/register
 * Public endpoint to register a new student for an organization
 * No authentication required
 */
export async function POST(
	request: NextRequest,
	{ params }: { params: Promise<{ slug: string }> },
) {
	try {
		const { slug } = await params;

		// Validate organization exists
		const organization = await getOrganizationBySlug(slug);

		if (!organization) {
			return NextResponse.json(
				{ error: "Organization not found" },
				{ status: 404 },
			);
		}

		const body = await request.json();
		const { fullName, email, phone } = body;

		// Validate required fields
		if (!fullName || typeof fullName !== "string" || fullName.trim().length === 0) {
			return NextResponse.json(
				{ error: "Full name is required" },
				{ status: 400 },
			);
		}

		// Validate email format if provided
		if (email && typeof email === "string" && email.trim().length > 0) {
			const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
			if (!emailRegex.test(email)) {
				return NextResponse.json(
					{ error: "Invalid email format" },
					{ status: 400 },
				);
			}
		}

		// Create student
		const newStudent = await createStudent({
			organizationId: organization.id,
			fullName: fullName.trim(),
			email: email?.trim() || null,
			phone: phone?.trim() || null,
		});

		return NextResponse.json(
			{
				student: {
					id: newStudent.id,
					fullName: newStudent.fullName,
					email: newStudent.email,
					phone: newStudent.phone,
				},
				organization: {
					id: organization.id,
					name: organization.name,
					slug: organization.slug,
				},
			},
			{ status: 201 },
		);
	} catch (error) {
		if (error instanceof NextResponse) {
			return error;
		}
		console.error("Error creating student registration:", error);
		return NextResponse.json(
			{ error: "Internal server error" },
			{ status: 500 },
		);
	}
}

