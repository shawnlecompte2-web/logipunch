import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';

export default async function(req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { origin, destination } = await req.json();
    if (!origin?.lat || !origin?.lng || !destination?.lat || !destination?.lng) {
      return Response.json({ success: false, error: 'Missing coordinates' }, { status: 400 });
    }

    // Try OSRM public routing API for driving time
    try {
      const url = `https://router.project-osrm.org/route/v1/driving/${origin.lng},${origin.lat};${destination.lng},${destination.lat}?overview=false`;
      const res = await fetch(url, { headers: { 'User-Agent': 'TapIN-TimeTracking' } });
      const data = await res.json();
      if (data.code === 'Ok' && data.routes && data.routes[0]) {
        const durationSec = data.routes[0].duration;
        const distanceM = data.routes[0].distance;
        const minutes = Math.max(0, Math.round(durationSec / 60));
        return Response.json({ success: true, minutes, distance: Math.round(distanceM) });
      }
    } catch (_e) {
      // Fall through to estimate
    }

    // Fallback: straight-line distance / 40 km/h urban average
    const R = 6371000;
    const toRad = (d: number) => (d * Math.PI) / 180;
    const dLat = toRad(destination.lat - origin.lat);
    const dLng = toRad(destination.lng - origin.lng);
    const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(origin.lat)) * Math.cos(toRad(destination.lat)) * Math.sin(dLng / 2) ** 2;
    const distanceM = R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const minutes = Math.max(0, Math.round((distanceM / 1000) / 40 * 60));
    return Response.json({ success: true, minutes, distance: Math.round(distanceM), estimated: true });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}