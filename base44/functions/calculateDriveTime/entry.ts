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

    // Reverse-geocode the origin address
    let address: string | null = null;
    try {
      const revRes = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${origin.lat}&lon=${origin.lng}&format=json&zoom=18`, {
        headers: { 'User-Agent': 'TapIN-TimeTracking' }
      });
      const revData = await revRes.json();
      address = revData?.display_name || null;
    } catch (_e) {
      // ignore
    }

    // Try OSRM public routing API for driving time
    let minutes: number | null = null;
    let distance: number | null = null;
    try {
      const url = `https://router.project-osrm.org/route/v1/driving/${origin.lng},${origin.lat};${destination.lng},${destination.lat}?overview=false`;
      const res = await fetch(url, { headers: { 'User-Agent': 'TapIN-TimeTracking' } });
      const data = await res.json();
      if (data.code === 'Ok' && data.routes && data.routes[0]) {
        minutes = Math.max(0, Math.round(data.routes[0].duration / 60));
        distance = Math.round(data.routes[0].distance);
      }
    } catch (_e) {
      // fall through to estimate
    }

    // Fallback: straight-line distance / 40 km/h urban average
    if (minutes === null) {
      const R = 6371000;
      const toRad = (d: number) => (d * Math.PI) / 180;
      const dLat = toRad(destination.lat - origin.lat);
      const dLng = toRad(destination.lng - origin.lng);
      const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(origin.lat)) * Math.cos(toRad(destination.lat)) * Math.sin(dLng / 2) ** 2;
      const distanceM = R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
      minutes = Math.max(0, Math.round((distanceM / 1000) / 40 * 60));
      distance = Math.round(distanceM);
    }

    return Response.json({ success: true, minutes, distance, address });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}