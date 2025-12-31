import { NextRequest, NextResponse } from "next/server";
import { getOrganizationBySlug } from "@/db/queries/organizations";

/**
 * GET /api/public/organizations/[slug]/public
 * Public endpoint to get organization information for display
 * Returns only public information (name, slug)
 * No authentication required
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  try {
    const { slug } = await params;

    // Get organization by slug
    const organization = await getOrganizationBySlug(slug);

    if (!organization) {
      return NextResponse.json(
        { error: "Organization not found" },
        { status: 404 },
      );
    }

    // Return only public information
    return NextResponse.json({
      name: organization.name,
      slug: organization.slug,
    });
  } catch (error) {
    console.error("Error fetching public organization info:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

