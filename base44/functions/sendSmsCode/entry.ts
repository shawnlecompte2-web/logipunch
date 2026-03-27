import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import twilio from 'npm:twilio@5.3.3';

// In-memory store for codes (keyed by phone number)
const codeStore = new Map();

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();
    const { action, phone, code, company_id } = body;

    if (action === 'send') {
      // Find user by phone in company
      const users = await base44.asServiceRole.entities.AppUser.filter({ phone, is_active: true, company_id });
      if (!users || users.length === 0) {
        return Response.json({ error: 'Aucun utilisateur trouvé avec ce numéro.' }, { status: 404 });
      }

      // Generate 6-digit code
      const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
      const expires = Date.now() + 10 * 60 * 1000; // 10 minutes
      codeStore.set(phone, { code: verificationCode, expires, userId: users[0].id });

      // Send SMS via Twilio
      const client = twilio(Deno.env.get('TWILIO_ACCOUNT_SID'), Deno.env.get('TWILIO_AUTH_TOKEN'));
      await client.messages.create({
        body: `Votre code TapIN : ${verificationCode} (valide 10 minutes)`,
        from: Deno.env.get('TWILIO_PHONE_NUMBER'),
        to: phone,
      });

      return Response.json({ success: true });
    }

    if (action === 'verify') {
      const entry = codeStore.get(phone);
      if (!entry) {
        return Response.json({ error: 'Aucun code envoyé pour ce numéro.' }, { status: 400 });
      }
      if (Date.now() > entry.expires) {
        codeStore.delete(phone);
        return Response.json({ error: 'Code expiré. Réessayez.' }, { status: 400 });
      }
      if (entry.code !== code) {
        return Response.json({ error: 'Code incorrect.' }, { status: 400 });
      }
      codeStore.delete(phone);

      // Return the user
      const users = await base44.asServiceRole.entities.AppUser.filter({ id: entry.userId });
      return Response.json({ success: true, user: users[0] });
    }

    return Response.json({ error: 'Action invalide.' }, { status: 400 });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});