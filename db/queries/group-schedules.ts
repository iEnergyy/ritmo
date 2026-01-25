import { db } from "@/db";
import { groupSchedules, groupScheduleSlots, classSessions } from "@/db/schema";
import { eq, and, gte, lte, asc, or, isNull } from "drizzle-orm";
import type { InferSelectModel } from "drizzle-orm";
import { getGroupById } from "@/db/queries/groups";
import { createSession } from "@/db/queries/class-sessions";

export type GroupSchedule = InferSelectModel<typeof groupSchedules>;
export type GroupScheduleSlot = InferSelectModel<typeof groupScheduleSlots>;

export type GroupScheduleWithSlots = GroupSchedule & {
	slots: GroupScheduleSlot[];
};

export type ScheduleRecurrence = "one_time" | "weekly" | "twice_weekly";

/**
 * Get the group's schedule(s) active as of a date (default today).
 * Respects effectiveFrom/effectiveTo; returns schedules that cover asOfDate.
 */
export async function getGroupSchedule(
	groupId: string,
	organizationId: string,
	asOfDate?: Date,
): Promise<GroupScheduleWithSlots[]> {
	const d = asOfDate ? new Date(asOfDate) : new Date();
	d.setHours(0, 0, 0, 0);
	const dateStr = d.toISOString().slice(0, 10);

	const rows = await db
		.select({
			schedule: groupSchedules,
			slot: groupScheduleSlots,
		})
		.from(groupSchedules)
		.innerJoin(
			groupScheduleSlots,
			eq(groupSchedules.id, groupScheduleSlots.groupScheduleId),
		)
		.where(
			and(
				eq(groupSchedules.groupId, groupId),
				eq(groupSchedules.organizationId, organizationId),
				lte(groupSchedules.effectiveFrom, dateStr),
				or(
					isNull(groupSchedules.effectiveTo),
					gte(groupSchedules.effectiveTo, dateStr),
				)!,
			),
		)
		.orderBy(
			asc(groupSchedules.effectiveFrom),
			asc(groupScheduleSlots.sortOrder),
		);

	const byScheduleId = new Map<string, GroupScheduleWithSlots>();
	for (const row of rows) {
		const s = row.schedule;
		const slot = row.slot;
		if (!byScheduleId.has(s.id)) {
			byScheduleId.set(s.id, { ...s, slots: [] });
		}
		byScheduleId.get(s.id)!.slots.push(slot);
	}
	return Array.from(byScheduleId.values());
}

/**
 * Get schedule slots that apply in a date range (for display or generation).
 * Returns schedules that overlap [fromDate, toDate] with their slots.
 */
export async function getScheduleSlots(
	groupId: string,
	organizationId: string,
	fromDate?: Date,
	toDate?: Date,
): Promise<GroupScheduleWithSlots[]> {
	const from = fromDate
		? new Date(fromDate).toISOString().slice(0, 10)
		: undefined;
	const to = toDate ? new Date(toDate).toISOString().slice(0, 10) : undefined;

	const conditions = [
		eq(groupSchedules.groupId, groupId),
		eq(groupSchedules.organizationId, organizationId),
	];
	if (to) {
		conditions.push(lte(groupSchedules.effectiveFrom, to));
	}
	if (from) {
		conditions.push(
			or(
				isNull(groupSchedules.effectiveTo),
				gte(groupSchedules.effectiveTo, from),
			)!,
		);
	}

	const rows = await db
		.select({
			schedule: groupSchedules,
			slot: groupScheduleSlots,
		})
		.from(groupSchedules)
		.innerJoin(
			groupScheduleSlots,
			eq(groupSchedules.id, groupScheduleSlots.groupScheduleId),
		)
		.where(and(...conditions))
		.orderBy(
			asc(groupSchedules.effectiveFrom),
			asc(groupScheduleSlots.sortOrder),
		);

	const byScheduleId = new Map<string, GroupScheduleWithSlots>();
	for (const row of rows) {
		const s = row.schedule;
		const slot = row.slot;
		if (!byScheduleId.has(s.id)) {
			byScheduleId.set(s.id, { ...s, slots: [] });
		}
		byScheduleId.get(s.id)!.slots.push(slot);
	}
	return Array.from(byScheduleId.values());
}

export interface UpsertGroupSchedulePayload {
	recurrence: ScheduleRecurrence;
	durationHours: number;
	effectiveFrom: string; // YYYY-MM-DD
	effectiveTo?: string | null; // YYYY-MM-DD
	applyToFutureOnly?: boolean;
	slots: Array<{ dayOfWeek: number; startTime: string; sortOrder?: number }>;
}

/**
 * Create or update the group's schedule.
 * When applyToFutureOnly is true, any schedule that would extend past effectiveFrom
 * gets effectiveTo = effectiveFrom - 1 day, then a new schedule row is inserted.
 */
export async function upsertGroupSchedule(
	groupId: string,
	organizationId: string,
	payload: UpsertGroupSchedulePayload,
): Promise<GroupScheduleWithSlots> {
	const { recurrence, durationHours, effectiveFrom, effectiveTo, slots } =
		payload;

	if (payload.applyToFutureOnly && effectiveFrom) {
		// End any current schedule that overlaps effectiveFrom (set effectiveTo = day before)
		const effFrom = new Date(effectiveFrom + "T12:00:00");
		effFrom.setDate(effFrom.getDate() - 1);
		const prevDay = effFrom.toISOString().slice(0, 10);
		await db
			.update(groupSchedules)
			.set({
				effectiveTo: prevDay,
			})
			.where(
				and(
					eq(groupSchedules.groupId, groupId),
					eq(groupSchedules.organizationId, organizationId),
					or(
						isNull(groupSchedules.effectiveTo),
						gte(groupSchedules.effectiveTo, effectiveFrom),
					)!,
				),
			);
	}

	const [newSchedule] = await db
		.insert(groupSchedules)
		.values({
			groupId,
			organizationId,
			recurrence,
			durationHours: String(durationHours),
			effectiveFrom,
			effectiveTo: effectiveTo || null,
		})
		.returning();

	const insertedSlots: GroupScheduleSlot[] = [];
	for (let i = 0; i < slots.length; i++) {
		const s = slots[i];
		const [slot] = await db
			.insert(groupScheduleSlots)
			.values({
				groupScheduleId: newSchedule.id,
				dayOfWeek: s.dayOfWeek,
				startTime: s.startTime,
				sortOrder: s.sortOrder ?? i,
			})
			.returning();
		insertedSlots.push(slot);
	}

	return { ...newSchedule, slots: insertedSlots };
}

/** Add durationHours (number) to "HH:mm" and return "HH:mm" */
function addHoursToTime(timeStr: string, durationHours: number): string {
	const [h, m] = timeStr.split(":").map(Number);
	const totalMins = h * 60 + m + Math.round(durationHours * 60);
	const outH = Math.floor(totalMins / 60) % 24;
	const outM = totalMins % 60;
	return `${String(outH).padStart(2, "0")}:${String(outM).padStart(2, "0")}`;
}

/** ISO day of week 1–7 (Monday=1) for a local date string YYYY-MM-DD */
function getIsoDayOfWeek(dateStr: string): number {
	const d = new Date(dateStr + "T12:00:00");
	const js = d.getDay();
	return js === 0 ? 7 : js;
}

/**
 * Generate class_sessions from the group's schedule for the date range.
 * Only creates sessions with date >= fromDate; never alters past sessions.
 * Uses group's teacherId and venueId.
 */
export async function generateSessionsFromSchedule(
	groupId: string,
	organizationId: string,
	fromDate: Date,
	toDate: Date,
): Promise<{ created: number }> {
	const group = await getGroupById(organizationId, groupId);
	if (!group) return { created: 0 };

	const fromStr = new Date(fromDate).toISOString().slice(0, 10);
	const toStr = new Date(toDate).toISOString().slice(0, 10);

	const scheduleList = await getScheduleSlots(
		groupId,
		organizationId,
		fromDate,
		toDate,
	);

	// Existing sessions for this group in range (to avoid duplicates)
	const existing = await db
		.select({ date: classSessions.date, startTime: classSessions.startTime })
		.from(classSessions)
		.where(
			and(
				eq(classSessions.organizationId, organizationId),
				eq(classSessions.groupId, groupId),
				gte(classSessions.date, fromStr),
				lte(classSessions.date, toStr),
			),
		);
	const existingSet = new Set(
		existing.map((e) => `${e.date}T${e.startTime ?? ""}`),
	);

	let created = 0;
	const cursor = new Date(fromDate);
	cursor.setHours(0, 0, 0, 0);
	const end = new Date(toDate);
	end.setHours(23, 59, 59, 999);

	while (cursor <= end) {
		const dateStr = cursor.toISOString().slice(0, 10);
		const isoDay = getIsoDayOfWeek(dateStr);

		for (const schedule of scheduleList) {
			const effFrom = schedule.effectiveFrom;
			const effTo = schedule.effectiveTo;
			if (dateStr < effFrom) continue;
			if (effTo && dateStr > effTo) continue;

			const durHours = Number(schedule.durationHours);
			for (const slot of schedule.slots) {
				if (slot.dayOfWeek !== isoDay) continue;
				const key = `${dateStr}T${slot.startTime}`;
				if (existingSet.has(key)) continue;

				const endTime = addHoursToTime(slot.startTime, durHours);
				await createSession({
					organizationId,
					groupId,
					venueId: group.venueId,
					teacherId: group.teacherId,
					date: new Date(dateStr + "T12:00:00"),
					startTime: slot.startTime,
					endTime,
					status: "scheduled",
				});
				created++;
				existingSet.add(key);
			}
		}
		cursor.setDate(cursor.getDate() + 1);
	}

	return { created };
}
