import { NextRequest, NextResponse } from "next/server";
import {
	getAuthenticatedSession,
	enforceTenantIsolation,
} from "@/lib/api-helpers";
import { getGroupById } from "@/db/queries/groups";
import {
	getGroupSchedule,
	getScheduleSlots,
	upsertGroupSchedule,
	generateSessionsFromSchedule,
	type ScheduleRecurrence,
} from "@/db/queries/group-schedules";

const RECURRENCE_VALUES: ScheduleRecurrence[] = [
	"one_time",
	"weekly",
	"twice_weekly",
];

const TIME_REGEX = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/;

/**
 * GET /api/organizations/[id]/groups/[groupId]/schedule
 * Return the group's time schedule (current and any future ranges)
 */
export async function GET(
	request: NextRequest,
	{ params }: { params: Promise<{ id: string; groupId: string }> },
) {
	try {
		const { id: organizationId, groupId } = await params;
		const session = await getAuthenticatedSession(request);

		await enforceTenantIsolation(organizationId, session.user.id);

		const group = await getGroupById(organizationId, groupId);
		if (!group) {
			return NextResponse.json({ error: "Group not found" }, { status: 404 });
		}

		const searchParams = request.nextUrl.searchParams;
		const fromStr = searchParams.get("from");
		const toStr = searchParams.get("to");

		let schedules;
		if (fromStr && toStr) {
			schedules = await getScheduleSlots(
				groupId,
				organizationId,
				new Date(fromStr),
				new Date(toStr),
			);
		} else {
			schedules = await getGroupSchedule(groupId, organizationId);
		}

		return NextResponse.json({ schedules });
	} catch (error) {
		if (error instanceof NextResponse) {
			return error;
		}
		console.error("Error fetching group schedule:", error);
		return NextResponse.json(
			{ error: "Internal server error" },
			{ status: 500 },
		);
	}
}

/**
 * PATCH /api/organizations/[id]/groups/[groupId]/schedule
 * Create or update the group's schedule. When applyToFutureOnly is true,
 * only sessions with date >= effectiveFrom are affected; historical sessions unchanged.
 */
export async function PATCH(
	request: NextRequest,
	{ params }: { params: Promise<{ id: string; groupId: string }> },
) {
	try {
		const { id: organizationId, groupId } = await params;
		const session = await getAuthenticatedSession(request);

		await enforceTenantIsolation(organizationId, session.user.id);

		const group = await getGroupById(organizationId, groupId);
		if (!group) {
			return NextResponse.json({ error: "Group not found" }, { status: 404 });
		}

		const body = await request.json();
		const {
			recurrence,
			durationHours,
			effectiveFrom,
			effectiveTo,
			applyToFutureOnly,
			slots,
			generateSessions,
			generateFrom,
			generateTo,
		} = body;

		if (!recurrence || !RECURRENCE_VALUES.includes(recurrence)) {
			return NextResponse.json(
				{ error: "Recurrence must be one_time, weekly, or twice_weekly" },
				{ status: 400 },
			);
		}

		if (durationHours == null || Number(durationHours) <= 0) {
			return NextResponse.json(
				{
					error:
						"Duration per session (hours) is required and must be positive",
				},
				{ status: 400 },
			);
		}

		if (!effectiveFrom || typeof effectiveFrom !== "string") {
			return NextResponse.json(
				{ error: "effectiveFrom (YYYY-MM-DD) is required" },
				{ status: 400 },
			);
		}

		const slotCount = Array.isArray(slots) ? slots.length : 0;
		if (recurrence === "twice_weekly" && slotCount !== 2) {
			return NextResponse.json(
				{ error: "Twice-weekly schedule must have exactly two slots" },
				{ status: 400 },
			);
		}
		if (
			(recurrence === "weekly" || recurrence === "one_time") &&
			slotCount !== 1
		) {
			return NextResponse.json(
				{ error: "Weekly and one-time schedules must have exactly one slot" },
				{ status: 400 },
			);
		}

		const normalisedSlots: Array<{
			dayOfWeek: number;
			startTime: string;
			sortOrder?: number;
		}> = [];
		for (let i = 0; i < (slots || []).length; i++) {
			const s = slots[i];
			const dow = Number(s?.dayOfWeek);
			if (!Number.isInteger(dow) || dow < 1 || dow > 7) {
				return NextResponse.json(
					{ error: `Slot ${i + 1}: dayOfWeek must be 1–7 (Monday–Sunday)` },
					{ status: 400 },
				);
			}
			const start = typeof s?.startTime === "string" ? s.startTime.trim() : "";
			if (!TIME_REGEX.test(start)) {
				return NextResponse.json(
					{ error: `Slot ${i + 1}: startTime must be HH:mm` },
					{ status: 400 },
				);
			}
			normalisedSlots.push({
				dayOfWeek: dow,
				startTime: start,
				sortOrder: i,
			});
		}

		const payload = {
			recurrence,
			durationHours: Number(durationHours),
			effectiveFrom,
			effectiveTo: effectiveTo ?? null,
			applyToFutureOnly: Boolean(applyToFutureOnly),
			slots: normalisedSlots,
		};

		const schedule = await upsertGroupSchedule(
			groupId,
			organizationId,
			payload,
		);

		let generated = { created: 0 };
		if (generateSessions && generateFrom && generateTo) {
			const from = new Date(generateFrom);
			const to = new Date(generateTo);
			if (from <= to) {
				generated = await generateSessionsFromSchedule(
					groupId,
					organizationId,
					from,
					to,
				);
			}
		}

		return NextResponse.json({
			schedule,
			generatedSessions: generated.created,
		});
	} catch (error) {
		if (error instanceof NextResponse) {
			return error;
		}
		console.error("Error updating group schedule:", error);
		return NextResponse.json(
			{ error: "Internal server error" },
			{ status: 500 },
		);
	}
}
