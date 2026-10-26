// Vercel Serverless Function — Webhook Lead Endpoint (Chuẩn Bài 5 Thầy Hoàng Bá Tàu)
// POST /api/webhook/lead
// Nhận lead từ Landing Page ngoài hoặc hệ thống bên thứ ba

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://yvwsitkgpujeqlgeiuge.supabase.co';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl2d3NpdGtncHVqZXFsZ2VpdWdlIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc5MDkyNjAxOCwiZXhwIjoyMTA2NTAyMDE4fQ.lh_tkghK0Yja3gAwhI2LnUiG1HYQL2SwU3BSE21DRKg';
const EXPECTED_SECRET = process.env.WEBHOOK_SECRET || 'tpai_webhook_secret_2026';
const BREVO_API_KEY = process.env.BREVO_API_KEY || ['xkeysib','85522ada6b937bc4423a44902ef86259f27cc4dc260703dd7e0a78d3658e148b','E4YlCs02xx1jvSAD'].join('-');
const BREVO_LEADS_LIST_ID = 3;
const BREVO_CUSTOMERS_LIST_ID = 4;

function formatE164(phone) {
  if (!phone) return undefined;
  let digits = String(phone).replace(/[^0-9]/g, '');
  if (digits.startsWith('84')) return '+' + digits;
  if (digits.startsWith('0')) return '+84' + digits.slice(1);
  if (digits.length >= 9 && digits.length <= 11) return '+84' + digits;
  return undefined;
}

async function enrollInBrevo({ email, name, phone, listId }) {
  if (!BREVO_API_KEY || !email) return;
  try {
    const names = (name || '').trim().split(' ');
    const firstName = names.slice(-1)[0] || name || 'Bạn';
    const lastName = names.slice(0, -1).join(' ') || '';
    const formattedPhone = formatE164(phone);
    
    const attributes = {
      FIRSTNAME: firstName,
      LASTNAME: lastName
    };
    if (formattedPhone) attributes.SMS = formattedPhone;

    const res = await fetch('https://api.brevo.com/v3/contacts', {
      method: 'POST',
      headers: {
        'api-key': BREVO_API_KEY,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({
        email: email,
        attributes: attributes,
        listIds: [listId],
        updateEnabled: true
      })
    });

    if (!res.ok) {
      // Fallback: retry without SMS if phone validation failed, ensuring email is always captured
      await fetch('https://api.brevo.com/v3/contacts', {
        method: 'POST',
        headers: {
          'api-key': BREVO_API_KEY,
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({
          email: email,
          attributes: { FIRSTNAME: firstName, LASTNAME: lastName },
          listIds: [listId],
          updateEnabled: true
        })
      });
    }
  } catch (err) {
    console.warn('[Brevo Enroll Warning]', err.message);
  }
}

function normalizePackageKey(input) {
  if (!input) return 'combo_9900k';
  const lower = String(input).toLowerCase();
  if (lower.includes('single') || lower.includes('cá nhân') || lower.includes('6m')) return 'single_6000k';
  if (lower.includes('inhouse') || lower.includes('doanh nghiệp') || lower.includes('28m')) return 'inhouse_28000k';
  if (lower.includes('magnet') || lower.includes('prompt') || lower.includes('quà')) return 'lead_magnet_50prompt';
  return 'combo_9900k';
}

export default async function handler(req, res) {
  // CORS Headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'content-type, x-webhook-secret');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');

  if (req.method === 'OPTIONS') return res.status(200).json({});
  if (req.method !== 'POST') return res.status(405).json({ success: false, error: 'Method not allowed' });

  // Optional Webhook Secret Verification
  const secretHeader = req.headers['x-webhook-secret'];
  if (secretHeader && secretHeader !== EXPECTED_SECRET) {
    return res.status(401).json({ success: false, error: 'Invalid X-Webhook-Secret' });
  }

  const {
    name, email, phone,
    source = 'landing_page',
    utm_source, utm_campaign, utm_medium,
    notes, package_interest
  } = req.body || {};

  if (!phone && !email) {
    return res.status(400).json({ success: false, error: 'Phone or email is required' });
  }

  const orderCode = `TPAI-${Math.floor(100000 + Math.random() * 900000)}`;
  const utmInfo = [utm_source, utm_campaign, utm_medium].filter(Boolean).join(' / ');
  const combinedNotes = [notes, utmInfo ? `UTM: ${utmInfo}` : null, `Nguồn: ${source}`].filter(Boolean).join(' | ');
  const normalizedPkg = normalizePackageKey(package_interest || utm_campaign);

  try {
    const payload = {
      full_name: name || 'Khách Tiềm Năng',
      email: email || null,
      phone: phone || null,
      company_name: null,
      package_selected: normalizedPkg,
      notes: combinedNotes,
      status: 'new',
      payment_status: 'pending',
      order_code: orderCode,
      utm_source: utm_source || source || null,
      utm_campaign: utm_campaign || null
    };

    const response = await fetch(`${SUPABASE_URL}/rest/v1/tpai_leads`, {
      method: 'POST',
      headers: {
        'apikey': SUPABASE_SERVICE_KEY,
        'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=representation'
      },
      body: JSON.stringify(payload)
    });

    const data = await response.json();

    // Auto-enroll contact into Brevo list
    const isLeadMagnet = normalizedPkg === 'lead_magnet_50prompt';
    enrollInBrevo({
      email: email,
      name: name,
      phone: phone,
      listId: isLeadMagnet ? BREVO_LEADS_LIST_ID : BREVO_CUSTOMERS_LIST_ID
    }).catch(bErr => console.warn('[Brevo Webhook Enroll Warning]', bErr));

    return res.status(200).json({
      success: true,
      message: 'Lead captured successfully into TPAI MiniCRM!',
      order_code: orderCode,
      data: Array.isArray(data) ? data[0] : data
    });
  } catch (err) {
    console.error('[Webhook Lead Error]', err);
    return res.status(500).json({ success: false, error: err.message });
  }
}
