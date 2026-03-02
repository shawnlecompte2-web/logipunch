import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);

        const fourteenDaysAgo = new Date();
        fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);

        // Get all approved entries
        const entries = await base44.asServiceRole.entities.PunchEntry.filter({ status: "approved" });

        let deleted = 0;
        for (const entry of entries) {
            const approvedAt = entry.approved_at ? new Date(entry.approved_at) : null;
            const punchOut = entry.punch_out ? new Date(entry.punch_out) : null;
            const referenceDate = approvedAt || punchOut;

            if (referenceDate && referenceDate < fourteenDaysAgo) {
                await base44.asServiceRole.entities.PunchEntry.delete(entry.id);
                deleted++;
            }
        }

        return Response.json({ success: true, deleted });
    } catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
});