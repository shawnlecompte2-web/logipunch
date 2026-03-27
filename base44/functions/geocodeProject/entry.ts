import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { event, data } = await req.json();

    // Skip if no address
    if (!data?.address) {
      return Response.json({ success: false, error: 'No address provided' }, { status: 400 });
    }

    // Skip if already has coordinates
    if (data.latitude && data.longitude) {
      return Response.json({ success: true, skipped: true, reason: 'Already has coordinates' });
    }

    // Geocode the address using Nominatim (OpenStreetMap)
    const encodedAddress = encodeURIComponent(data.address);
    const geoRes = await fetch(
      `https://nominatim.openstreetmap.org/search?q=${encodedAddress}&format=json&limit=1`,
      { headers: { 'User-Agent': 'TapIN-TimeTracking' } }
    );

    const geoData = await geoRes.json();
    if (!geoData || geoData.length === 0) {
      return Response.json({ success: false, error: 'Address not found' }, { status: 400 });
    }

    const { lat, lon } = geoData[0];
    const latitude = parseFloat(lat);
    const longitude = parseFloat(lon);

    // Update the project with coordinates
    await base44.asServiceRole.entities.Project.update(data.id, {
      latitude,
      longitude,
    });

    return Response.json({ success: true, latitude, longitude });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});