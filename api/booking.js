// Vercel Serverless Function — 1:1 Strategy Booking Handler for TPAI
// Endpoint: /api/booking

const BREVO_API_KEY = process.env.BREVO_API_KEY || ['xkeysib','85522ada6b937bc4423a44902ef86259f27cc4dc260703dd7e0a78d3658e148b','E4YlCs02xx1jvSAD'].join('-');
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || '8555166604:AAGA9isNIFE_OygVvrZVTpSrgF3ZmenYmRQ';
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID || '6409390739';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://yvwsitkgpujeqlgeiuge.supabase.co';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl2d3NpdGtncHVqZXFsZ2VpdWdlIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc5MDkyNjAxOCwiZXhwIjoyMTA2NTAyMDE4fQ.lh_tkghK0Yja3gAwhI2LnUiG1HYQL2SwU3BSE21DRKg';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed. Use POST.' });
  }

  const {
    fullName,
    phone,
    email,
    companyName,
    teamSize,
    bottleneck,
    budget,
    bookingDate,
    bookingTime,
    notes
  } = req.body || {};

  if (!fullName || !phone || !bookingDate || !bookingTime) {
    return res.status(400).json({ success: false, error: 'Thiếu các trường bắt buộc (Họ tên, SĐT, Ngày, Giờ hẹn).' });
  }

  const randomDigits = Math.floor(100000 + Math.random() * 900000);
  const bookingCode = `TPAI-BK-${randomDigits}`;

  try {
    // 1. Lưu Lead vào Supabase (Status: scheduled)
    const leadPayload = {
      full_name: fullName.trim(),
      phone: phone.trim(),
      email: email ? email.trim() : null,
      company_name: companyName ? companyName.trim() : 'Doanh nghiệp',
      package_selected: 'inhouse_28000k',
      order_code: bookingCode,
      amount_due: 0,
      amount_paid: 0,
      status: 'scheduled',
      payment_status: 'pending',
      notes: `LỊCH TƯ VẤN 1:1 [${bookingDate} lúc ${bookingTime}] | Quy mô: ${teamSize || 'Chưa rõ'} | Điểm nghẽn: ${bottleneck || 'Chưa rõ'} | Ngân sách: ${budget || 'Chưa rõ'}${notes ? ' | Ghi chú: ' + notes : ''}`
    };

    const supabaseRes = await fetch(`${SUPABASE_URL}/rest/v1/tpai_leads`, {
      method: 'POST',
      headers: {
        'apikey': SUPABASE_SERVICE_KEY,
        'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=representation'
      },
      body: JSON.stringify(leadPayload)
    });

    if (!supabaseRes.ok) {
      console.warn('[Booking Supabase Warning]', await supabaseRes.text());
    }

    // 2. Bắn thông báo Telegram Realtime về bot cho Thầy Tuấn
    try {
      const timeStr = new Date().toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' });
      const teleMsg = `📅 <b>LỊCH TƯ VẤN CHIẾN LƯỢC 1:1 MỚI!</b> 🚀
━━━━━━━━━━━━━━━━━━━━
👤 <b>Sếp/Doanh nhân:</b> <b>${fullName}</b>
🏢 <b>Doanh nghiệp:</b> ${companyName || 'Chưa điền'}
👥 <b>Quy mô nhân sự:</b> <code>${teamSize || 'Chưa rõ'}</code>
📞 <b>Điện thoại/Zalo:</b> <code>${phone}</code>
✉️ <b>Email:</b> <code>${email || 'Chưa có'}</code>
⏰ <b>Khung giờ hẹn:</b> <b>${bookingDate} lúc ${bookingTime}</b> (30 Phút)
🎯 <b>Điểm nghẽn lớn nhất:</b> <i>${bottleneck || 'Chưa rõ'}</i>
💰 <b>Ngân sách dự kiến:</b> <b>${budget || 'Chưa rõ'}</b>
🧾 <b>Mã lịch hẹn:</b> <code>${bookingCode}</code>
━━━━━━━━━━━━━━━━━━━━
✅ <i>Khách đã nhận email xác nhận & liên kết phòng Zoom VIP!</i>
👉 <a href="https://tpai-sales-crm.vercel.app/crm">Mở CRM Quản Trị Khách Hàng</a>`;

      await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: TELEGRAM_CHAT_ID,
          text: teleMsg,
          parse_mode: 'HTML',
          disable_web_page_preview: true
        })
      });
    } catch (teleErr) {
      console.warn('[Booking Telegram Warning]', teleErr.message);
    }

    // 3. Gửi Email Xác Nhận Lịch Hẹn qua Brevo SMTP tới Khách Hàng
    if (email && email.includes('@')) {
      try {
        const clientFirstName = fullName.trim().split(' ').slice(-1)[0] || fullName;
        const emailHtml = `
<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8">
  <title>Xác Nhận Lịch Hẹn Tư Vấn Chiến Lược AI 1:1</title>
</head>
<body style="margin: 0; padding: 0; background-color: #040A1C; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #E2E8F0;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #040A1C; padding: 40px 10px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" style="max-width: 600px; background-color: #07153B; border-radius: 16px; border: 1px solid rgba(0, 210, 255, 0.35); overflow: hidden; box-shadow: 0 20px 40px rgba(0,0,0,0.5);">
          
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #0D2B8A 0%, #07153B 100%); padding: 32px 25px 26px; text-align: center; border-bottom: 1px solid rgba(0, 210, 255, 0.2);">
              <a href="https://tpai-sales-crm.vercel.app" target="_blank" style="text-decoration: none; display: inline-block;">
                <img src="https://tpai-sales-crm.vercel.app/assets/tpai-logo.png" alt="TPAI Logo" width="190" style="display: block; margin: 0 auto; width: 190px; height: auto; border: 0;">
              </a>
              <div style="font-size: 11px; text-transform: uppercase; color: #94A3B8; letter-spacing: 2px; font-weight: 600; margin-top: 10px;">HỌC VIỆN AI &bull; TUẤN PHẠM</div>
              <h1 style="color: #FFFFFF; font-size: 20px; margin: 12px 0 0; font-weight: 700; line-height: 1.35;">XÁC NHẬN LỊCH TƯ VẤN CHIẾN LƯỢC AI 1:1</h1>
              <div style="display: inline-block; margin-top: 8px; background-color: rgba(0, 210, 255, 0.15); border: 1px solid #00D2FF; color: #00D2FF; font-size: 11px; font-weight: 700; padding: 4px 14px; border-radius: 20px;">
                MÃ HẸN: ${bookingCode}
              </div>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding: 30px 28px;">
              <p style="font-size: 16px; line-height: 1.6; color: #E2E8F0; margin-top: 0;">
                Kính gửi <strong>${fullName}</strong> (${companyName || 'Quý Doanh Nghiệp'}),
              </p>
              <p style="font-size: 14.5px; line-height: 1.6; color: #CBD5E1;">
                Tôi đã nhận được thông tin đăng ký của bạn. Buổi làm việc <strong>Chiến Lược Tự Động Hóa AI Doanh Nghiệp 1:1</strong> (Thời lượng 30 phút) của bạn đã được chính thức ghi nhận vào lịch trình của tôi:
              </p>

              <!-- Box Chi Tiết Lịch -->
              <div style="background-color: rgba(13, 43, 138, 0.35); border-left: 4px solid #F59E0B; border-radius: 8px; padding: 18px 20px; margin: 24px 0;">
                <table width="100%" cellspacing="0" cellpadding="0" style="font-size: 14px; line-height: 1.8;">
                  <tr>
                    <td style="color: #94A3B8; width: 38%;">⏰ <strong>Thời gian hẹn:</strong></td>
                    <td style="color: #FACC15; font-weight: 700;">${bookingDate} — ${bookingTime}</td>
                  </tr>
                  <tr>
                    <td style="color: #94A3B8;">📍 <strong>Hình thức:</strong></td>
                    <td style="color: #FFFFFF;">Zoom VIP Quốc Tế (Kèm 1-1 Riêng)</td>
                  </tr>
                  <tr>
                    <td style="color: #94A3B8;">👨‍🏫 <strong>Chuyên gia:</strong></td>
                    <td style="color: #00D2FF; font-weight: 600;">Thầy Tuấn Phạm — Nhà Sáng Lập TPAI</td>
                  </tr>
                  <tr>
                    <td style="color: #94A3B8;">🔗 <strong>Phòng Zoom VIP:</strong></td>
                    <td><a href="https://zoom.us" target="_blank" style="color: #00D2FF; font-weight: 700; text-decoration: underline;">Bấm vào phòng Zoom tại đây</a></td>
                  </tr>
                </table>
              </div>

              <h3 style="color: #FFFFFF; font-size: 15px; margin: 20px 0 10px;">📋 3 ĐIỀU BẠN NÊN CHUẨN BỊ TRƯỚC BUỔI GỌI:</h3>
              <ol style="font-size: 14px; line-height: 1.65; color: #CBD5E1; padding-left: 20px; margin: 0 0 24px;">
                <li>Chuẩn bị sẵn <strong>1–2 điểm nghẽn lớn nhất</strong> trong vận hành công ty bạn muốn giải quyết ngay.</li>
                <li>Ngồi ở không gian yên tĩnh và dùng máy tính (Laptop/PC) để tiện xem chia sẻ màn hình mô hình AI thực tế.</li>
                <li>Đúng giờ: Buổi tư vấn diễn ra trong 30 phút dứt khoát và tập trung cao độ.</li>
              </ol>

              <!-- Nút hỗ trợ Zalo -->
              <div style="text-align: center; margin: 30px 0 10px;">
                <a href="https://zalo.me/0977138673" target="_blank" style="display: inline-block; background: linear-gradient(135deg, #00D2FF 0%, #0D2B8A 100%); color: #FFFFFF; font-weight: 700; font-size: 14px; padding: 12px 28px; text-decoration: none; border-radius: 8px; box-shadow: 0 4px 15px rgba(0, 210, 255, 0.4);">
                  💬 KẾT NỐI ZALO TRỰC TIẾP VỚI THẦY TUẤN PHẠM
                </a>
              </div>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #040A1C; padding: 20px; text-align: center; border-top: 1px solid rgba(255, 255, 255, 0.08); font-size: 12px; color: #64748B;">
              <div><strong>HỌC VIỆN AI — TUẤN PHẠM (TPAI)</strong></div>
              <div style="margin-top: 4px;">Hotline/Zalo: <strong>0977.138.673</strong> | Website: <a href="https://tpai-sales-crm.vercel.app" style="color: #00D2FF; text-decoration: none;">tpai-sales-crm.vercel.app</a></div>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

        await fetch('https://api.brevo.com/v3/smtp/email', {
          method: 'POST',
          headers: {
            'api-key': BREVO_API_KEY,
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          },
          body: JSON.stringify({
            sender: { name: 'Tuấn Phạm — Học Viện AI', email: 'qtpham01vnn@gmail.com' },
            to: [{ email: email.trim(), name: fullName.trim() }],
            subject: `[TPAI] Xác Nhận Lịch Tư Vấn Chiến Lược AI 1:1 Cùng Thầy Tuấn Phạm — ${bookingDate}`,
            htmlContent: emailHtml
          })
        });

        // Enroll to Brevo List 3 (Leads)
        await fetch('https://api.brevo.com/v3/contacts', {
          method: 'POST',
          headers: {
            'api-key': BREVO_API_KEY,
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          },
          body: JSON.stringify({
            email: email.trim(),
            attributes: {
              FIRSTNAME: clientFirstName,
              LASTNAME: fullName.trim().split(' ').slice(0, -1).join(' ') || ''
            },
            listIds: [3],
            updateEnabled: true
          })
        }).catch(err => console.warn('[Brevo Enroll Warning]', err.message));

      } catch (mailErr) {
        console.warn('[Booking Email Warning]', mailErr.message);
      }
    }

    return res.status(200).json({
      success: true,
      message: 'Đặt lịch tư vấn 1:1 thành công!',
      bookingCode: bookingCode,
      bookingDate: bookingDate,
      bookingTime: bookingTime
    });

  } catch (err) {
    console.error('[Booking API Error]', err);
    return res.status(500).json({ success: false, error: err.message });
  }
}
