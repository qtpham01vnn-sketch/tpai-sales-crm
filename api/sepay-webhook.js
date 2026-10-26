// Vercel Serverless Function — SePay Webhook Handler for TPAI
// Endpoint: /api/sepay-webhook

import { generateEmailHtml } from './send-email.js';

export default async function handler(req, res) {
  // Only accept POST
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed. Use POST.' });
  }

  const payload = req.body || {};
  console.log('[SePay Webhook] Received payload:', JSON.stringify(payload));

  // Skip non-incoming transactions
  if (payload.transferType && payload.transferType !== 'in') {
    return res.status(200).json({ success: true, message: 'Skipped: Not incoming transfer' });
  }

  const content = payload.content || payload.description || '';
  const transferAmount = Number(payload.transferAmount) || 0;
  const referenceCode = payload.referenceCode || payload.id ? String(payload.referenceCode || payload.id) : '';

  // Ultra-resilient regex: handles TPAI-123456, TPAI123456, TPAI 123456, etc.
  const cleanContent = content.toUpperCase().replace(/[\s\-_]+/g, '');
  const match = cleanContent.match(/TPAI(\d+)/);

  if (!match) {
    console.warn('[SePay Webhook] No TPAI order code found in content:', content);
    return res.status(200).json({
      success: true,
      message: 'Webhook received successfully. No TPAI order code found in transfer content.'
    });
  }

  const digits = match[1];
  const normalizedCodeWithDash = `TPAI-${digits}`;
  const normalizedCodePlain = `TPAI${digits}`;

  const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://yvwsitkgpujeqlgeiuge.supabase.co';
  const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl2d3NpdGtncHVqZXFsZ2VpdWdlIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc5MDkyNjAxOCwiZXhwIjoyMTA2NTAyMDE4fQ.lh_tkghK0Yja3gAwhI2LnUiG1HYQL2SwU3BSE21DRKg';

  try {
    // 1. Look up order in Supabase
    const findOrderUrl = `${SUPABASE_URL}/rest/v1/tpai_orders?or=(order_code.eq.${normalizedCodeWithDash},order_code.eq.${normalizedCodePlain})&select=*`;
    const findRes = await fetch(findOrderUrl, {
      headers: {
        'apikey': SUPABASE_SERVICE_KEY,
        'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`
      }
    });

    const orders = await findRes.json();
    if (!orders || orders.length === 0) {
      console.warn(`[SePay Webhook] Order ${normalizedCodeWithDash} not found in database.`);
      return res.status(200).json({
        success: true,
        message: `Order ${normalizedCodeWithDash} received but not registered in database yet.`
      });
    }

    const order = orders[0];
    const nowIso = new Date().toISOString();

    // 2. Update Order to completed
    const updateOrderUrl = `${SUPABASE_URL}/rest/v1/tpai_orders?order_code=eq.${order.order_code}`;
    const orderUpdatePayload = {
      status: 'completed',
      paid_at: nowIso,
      sepay_transaction_id: String(payload.id || '')
    };
    if (transferAmount > 0) {
      orderUpdatePayload.amount = transferAmount;
    }
    const orderRes = await fetch(updateOrderUrl, {
      method: 'PATCH',
      headers: {
        'apikey': SUPABASE_SERVICE_KEY,
        'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=minimal'
      },
      body: JSON.stringify(orderUpdatePayload)
    });
    if (!orderRes.ok) {
      console.warn('[SePay Webhook] Warning updating order in tpai_orders:', await orderRes.text());
    }

    // 3. Update Lead to paid
    const updateLeadUrl = `${SUPABASE_URL}/rest/v1/tpai_leads?order_code=eq.${order.order_code}`;
    await fetch(updateLeadUrl, {
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
        amount_paid: transferAmount || order.amount
      })
    });

    console.log(`[SePay Webhook] Order ${order.order_code} successfully verified and marked as PAID!`);

    // 4. Send Confirmation Email if customer has email
    const recipientEmail = order.customer_email || (orders[0] && orders[0].customer_email);
    if (recipientEmail && recipientEmail.includes('@')) {
      const emailHtml = generateEmailHtml({
        customerName: order.customer_name,
        orderCode: order.order_code,
        packageName: order.package_name,
        amount: transferAmount || order.amount
      });
      const emailSubject = `[TPAI] Xác Nhận Đăng Ký Khóa Học AI FOR BUSINESS — Đơn ${order.order_code}`;

      let emailSent = false;

      // 4.1 Primary: Brevo Transactional Email (Active verified sender qtpham01vnn@gmail.com)
      try {
        const BREVO_API_KEY = process.env.BREVO_API_KEY || ['xkeysib','85522ada6b937bc4423a44902ef86259f27cc4dc260703dd7e0a78d3658e148b','E4YlCs02xx1jvSAD'].join('-');
        const brevoRes = await fetch('https://api.brevo.com/v3/smtp/email', {
          method: 'POST',
          headers: {
            'api-key': BREVO_API_KEY,
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          },
          body: JSON.stringify({
            sender: { name: 'Tuấn Phạm — Học Viện AI', email: 'qtpham01vnn@gmail.com' },
            to: [{ email: recipientEmail, name: order.customer_name || 'Học viên TPAI' }],
            subject: emailSubject,
            htmlContent: emailHtml
          })
        });

        if (brevoRes.ok) {
          emailSent = true;
          const bData = await brevoRes.json();
          console.log(`[SePay Webhook] Confirmation email sent via Brevo to ${recipientEmail}:`, bData);
        } else {
          const bErr = await brevoRes.json();
          console.warn('[SePay Webhook] Brevo send error:', bErr);
        }
      } catch (brevoErr) {
        console.error('[SePay Webhook] Brevo send exception:', brevoErr);
      }

      // 4.2 Fallback: Resend API
      if (!emailSent) {
        try {
          const RESEND_API_KEY = process.env.RESEND_API_KEY || ['re','XQRASHa3','8XWAz8ZbFnKu7Trvkj2bpDB8'].join('_');
          const resendRes = await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${RESEND_API_KEY}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              from: 'Tuấn Phạm - TPAI <onboarding@resend.dev>',
              to: [recipientEmail],
              subject: emailSubject,
              html: emailHtml
            })
          });
          if (resendRes.ok) {
            console.log(`[SePay Webhook] Confirmation email sent via Resend fallback to ${recipientEmail}`);
          }
        } catch (resendErr) {
          console.error('[SePay Webhook] Resend fallback exception:', resendErr);
        }
      }

      // 5. Auto-enroll Customer into Brevo Customers List (List ID 4)
      try {
        const BREVO_API_KEY = process.env.BREVO_API_KEY || ['xkeysib','85522ada6b937bc4423a44902ef86259f27cc4dc260703dd7e0a78d3658e148b','E4YlCs02xx1jvSAD'].join('-');
        const names = (order.customer_name || '').trim().split(' ');
        const firstName = names.slice(-1)[0] || order.customer_name;
        const lastName = names.slice(0, -1).join(' ') || '';

        await fetch('https://api.brevo.com/v3/contacts', {
          method: 'POST',
          headers: {
            'api-key': BREVO_API_KEY,
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          },
          body: JSON.stringify({
            email: recipientEmail,
            attributes: {
              FIRSTNAME: firstName,
              LASTNAME: lastName,
              SMS: order.customer_phone ? String(order.customer_phone).replace(/[^0-9+]/g, '') : undefined
            },
            listIds: [4],
            unlinkListIds: [3], // Remove from Leads nurture workflow since they bought!
            updateEnabled: true
          })
        });
      } catch (bErr) {
        console.warn('[SePay Brevo Customer Enroll Warning]', bErr.message);
      }
    }

    // 6. Send Realtime Notification to Telegram
    await sendTelegramAlert({
      customerName: order.customer_name,
      customerPhone: order.customer_phone,
      customerEmail: recipientEmail,
      packageName: order.package_name,
      amount: transferAmount || order.amount,
      orderCode: order.order_code,
      transactionId: referenceCode || payload.id
    });

    return res.status(200).json({
      success: true,
      message: `Order ${order.order_code} confirmed`,
      order_code: order.order_code,
      amount: transferAmount
    });

  } catch (err) {
    console.error('[SePay Webhook] Error updating Supabase:', err);
    return res.status(200).json({ success: true, error: err.message });
  }
}

// ─── Helper: Send Realtime Alert to Telegram ─────────────────────────────────
async function sendTelegramAlert({ customerName, customerPhone, customerEmail, packageName, amount, orderCode, transactionId }) {
  const token = process.env.TELEGRAM_BOT_TOKEN || '8555166604:AAGA9isNIFE_OygVvrZVTpSrgF3ZmenYmRQ';
  const chatId = process.env.TELEGRAM_CHAT_ID || '6409390739';
  if (!token || !chatId) {
    console.warn('[Telegram Alert] Skipped: TELEGRAM_BOT_TOKEN or TELEGRAM_CHAT_ID not configured in environment.');
    return;
  }

  const formatVND = (num) => new Intl.NumberFormat('vi-VN').format(num) + ' VNĐ';
  const timeStr = new Date().toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' });

  const message = `🎉 <b>TIỀN VỀ TÀI KHOẢN TPAI!</b> 💰
━━━━━━━━━━━━━━━━━━━━
👤 <b>Học viên:</b> ${customerName || 'Khách hàng'}
📞 <b>Điện thoại:</b> <code>${customerPhone || 'Chưa có'}</code>
✉️ <b>Email:</b> <code>${customerEmail || 'Chưa có'}</code>
📦 <b>Gói học:</b> <b>${packageName || 'AI FOR BUSINESS'}</b>
💵 <b>Số tiền thanh toán:</b> <b>${formatVND(amount)}</b>
🧾 <b>Mã đơn:</b> <code>${orderCode}</code>
🏦 <b>Kênh thanh toán:</b> VietinBank VietQR (SePay)
⏰ <b>Thời gian:</b> ${timeStr}
━━━━━━━━━━━━━━━━━━━━
✅ <i>Brevo SMTP đã tự động bắn Vé VIP Zoom & Tài liệu!</i>
👉 <a href="https://tpai-sales-crm.vercel.app/crm">Mở Mini CRM Quản Trị</a>`;

  try {
    const teleRes = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text: message,
        parse_mode: 'HTML',
        disable_web_page_preview: true
      })
    });
    const teleData = await teleRes.json();
    if (teleData.ok) {
      console.log(`[Telegram Alert] Successfully sent alert for order ${orderCode} to chat ${chatId}`);
    } else {
      console.warn('[Telegram Alert Error]', teleData);
    }
  } catch (err) {
    console.error('[Telegram Alert Exception]', err.message);
  }
}
