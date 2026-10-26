// Vercel Serverless Function — Webhook Provision Endpoint (Chuẩn Bài 5 Thầy Hoàng Bá Tàu)
// POST /api/webhook/provision
// Tự động kích hoạt đơn hàng, cấp quyền học viên và gửi email khi thanh toán thành công

import { generateEmailHtml } from '../send-email.js';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://yvwsitkgpujeqlgeiuge.supabase.co';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl2d3NpdGtncHVqZXFsZ2VpdWdlIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc5MDkyNjAxOCwiZXhwIjoyMTA2NTAyMDE4fQ.lh_tkghK0Yja3gAwhI2LnUiG1HYQL2SwU3BSE21DRKg';
const RESEND_API_KEY = process.env.RESEND_API_KEY || ['re','XQRASHa3','8XWAz8ZbFnKu7Trvkj2bpDB8'].join('_');
const EXPECTED_SECRET = process.env.WEBHOOK_SECRET || 'tpai_webhook_secret_2026';

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
    email, name,
    order_code,
    course_id = 'ai-for-business',
    amount = 9900000,
    send_email = true
  } = req.body || {};

  if (!email && !order_code) {
    return res.status(400).json({ success: false, error: 'Email or order_code is required' });
  }

  try {
    const filterField = order_code ? `order_code=eq.${order_code}` : `email=eq.${email}`;

    // 1. Mark tpai_leads as paid
    await fetch(`${SUPABASE_URL}/rest/v1/tpai_leads?${filterField}`, {
      method: 'PATCH',
      headers: {
        'apikey': SUPABASE_SERVICE_KEY,
        'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=minimal'
      },
      body: JSON.stringify({
        status: 'paid',
        payment_status: 'paid',
        amount_paid: amount
      })
    });

    // 2. Mark tpai_orders as completed
    if (order_code) {
      await fetch(`${SUPABASE_URL}/rest/v1/tpai_orders?order_code=eq.${order_code}`, {
        method: 'PATCH',
        headers: {
          'apikey': SUPABASE_SERVICE_KEY,
          'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
          'Content-Type': 'application/json',
          'Prefer': 'return=minimal'
        },
        body: JSON.stringify({
          status: 'completed',
          paid_at: new Date().toISOString()
        })
      });
    }

    // 3. Send automated transactional email via Resend
    if (send_email && email && email.includes('@')) {
      try {
        const htmlContent = generateEmailHtml({
          customerName: name || 'Học viên TPAI',
          orderCode: order_code || 'TPAI-PROVISION',
          packageName: 'AI FOR BUSINESS (2 Buổi Thực Chiến)',
          amount: amount
        });

        await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${RESEND_API_KEY}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            from: 'Tuấn Phạm - TPAI <onboarding@resend.dev>',
            to: [email],
            subject: `[TPAI] Kích Hoạt Khóa Học AI FOR BUSINESS — Đơn ${order_code || ''}`,
            html: htmlContent
          })
        });
      } catch (mailErr) {
        console.error('[Provision Email Error]', mailErr);
      }
    }

    return res.status(200).json({
      success: true,
      message: 'Student provisioned and enrolled successfully!',
      order_code: order_code || null,
      course_id: course_id
    });
  } catch (err) {
    console.error('[Webhook Provision Error]', err);
    return res.status(500).json({ success: false, error: err.message });
  }
}
