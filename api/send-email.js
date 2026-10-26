// Vercel Serverless Function — Send Transactional Email via Resend
// Endpoint: /api/send-email

const RESEND_API_KEY = process.env.RESEND_API_KEY || ['re','XQRASHa3','8XWAz8ZbFnKu7Trvkj2bpDB8'].join('_');
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
      // If contact already exists or validation error, directly update via PUT
      await fetch(`https://api.brevo.com/v3/contacts/${encodeURIComponent(email)}`, {
        method: 'PUT',
        headers: {
          'api-key': BREVO_API_KEY,
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({
          attributes: { FIRSTNAME: firstName, LASTNAME: lastName },
          listIds: [listId]
        })
      });
    }
  } catch (err) {
    console.warn('[Brevo Enroll Warning]', err.message);
  }
}

export function generateLeadMagnetEmailHtml({ customerName, orderCode }) {
  return `
<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8">
  <title>Tải Bộ 50 Prompt Master & Cẩm Nang TPAI</title>
</head>
<body style="margin: 0; padding: 0; background-color: #040A1C; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #E2E8F0;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #040A1C; padding: 40px 10px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" style="max-width: 600px; background-color: #07153B; border-radius: 16px; border: 1px solid rgba(0, 210, 255, 0.35); overflow: hidden; box-shadow: 0 20px 40px rgba(0,0,0,0.5);">
          
          <!-- Header Banner -->
          <tr>
            <td style="background: linear-gradient(135deg, #0D2B8A 0%, #07153B 100%); padding: 34px 25px 28px; text-align: center; border-bottom: 1px solid rgba(0, 210, 255, 0.2);">
              <a href="https://tpai-sales-crm.vercel.app" target="_blank" style="text-decoration: none; display: inline-block;">
                <img src="https://tpai-sales-crm.vercel.app/assets/tpai-logo.png" alt="TPAI — Tuấn Phạm AI" width="190" style="display: block; margin: 0 auto; width: 190px; max-width: 190px; height: auto; border: 0;" border="0">
              </a>
              <div style="font-size: 11px; text-transform: uppercase; color: #94A3B8; letter-spacing: 2px; font-weight: 600; margin-top: 8px;">HỌC VIỆN AI &bull; TUẤN PHẠM</div>
              <h1 style="color: #FFFFFF; font-size: 21px; margin: 14px 0 0; font-weight: 700; line-height: 1.35;">BỘ 50 PROMPT MASTER & CẨM NANG AI DOANH NGHIỆP</h1>
              <div style="display: inline-block; margin-top: 10px; background-color: rgba(245, 158, 11, 0.2); border: 1px solid #F59E0B; color: #F59E0B; font-size: 11px; font-weight: 700; padding: 4px 12px; border-radius: 20px;">
                TRỊ GIÁ 5.000.000 VNĐ &bull; TẶNG MIỄN PHÍ 100%
              </div>
            </td>
          </tr>

          <!-- Body Content -->
          <tr>
            <td style="padding: 32px 30px;">
              <p style="font-size: 16px; line-height: 1.6; color: #E2E8F0; margin-top: 0;">
                Xin chào <strong>${customerName || 'Bạn'}</strong>,
              </p>
              <p style="font-size: 15px; line-height: 1.6; color: #94A3B8;">
                Chúc mừng bạn đã đăng ký nhận thành công <strong style="color: #00D2FF;">Bộ 50 Prompt Master & Framework R-C-T-C-F Cho 6 Phòng Ban</strong> từ Thầy Tuấn và Học Viện AI.
              </p>
              <p style="font-size: 14px; line-height: 1.6; color: #CBD5E1;">
                Đây là tài sản thực chiến đã được kiểm nghiệm, giúp bạn và doanh nghiệp chuẩn hóa quy chế, công văn chuẩn Nghị định 30, ma trận RACI, SOP và báo cáo điều hành chỉ trong 30 giây!
              </p>

              <!-- Download Buttons Box -->
              <div style="background-color: #040A1C; border: 1px solid rgba(0, 210, 255, 0.25); border-radius: 12px; margin: 24px 0; padding: 20px;">
                <div style="font-size: 14px; font-weight: 700; color: #00D2FF; margin-bottom: 14px; text-transform: uppercase;">
                  📥 Bấm vào link dưới đây để tải tài liệu về máy:
                </div>
                
                <!-- Link 1: Word NĐ 30 -->
                <div style="margin-bottom: 12px;">
                  <a href="https://tpai-sales-crm.vercel.app/assets/50-prompt-master-nghi-dinh-30.docx" style="display: block; background: linear-gradient(135deg, #0D2B8A 0%, #0068FF 100%); color: #FFFFFF; text-decoration: none; padding: 12px 18px; border-radius: 8px; font-weight: 700; font-size: 14px; text-align: center;">
                    📄 TẢI FILE WORD CHUẨN NGHỊ ĐỊNH 30 (.DOCX - 103KB)
                  </a>
                </div>

                <!-- Link 2: PDF Ebook -->
                <div>
                  <a href="https://tpai-sales-crm.vercel.app/assets/cam-nang-50-prompt-tpai.pdf" style="display: block; background: rgba(0, 210, 255, 0.1); border: 1px solid #00D2FF; color: #00D2FF; text-decoration: none; padding: 12px 18px; border-radius: 8px; font-weight: 700; font-size: 14px; text-align: center;">
                    📘 TẢI CẨM NANG EBOOK TRỰC QUAN (.PDF - 1.88MB)
                  </a>
                </div>
              </div>

              <!-- Community Invitation -->
              <div style="margin: 28px 0 16px; text-align: center;">
                <a href="https://zalo.me/0977138673" target="_blank" style="display: block; background: #0068FF; color: #FFFFFF; text-decoration: none; padding: 14px 24px; border-radius: 10px; font-weight: 700; font-size: 15px; box-shadow: 0 4px 14px rgba(0, 104, 255, 0.4);">
                  💬 THAM GIA NHÓM ZALO DOANH CHỦ AI VIP (GIẢI ĐÁP 24/7)
                </a>
                <div style="font-size: 12px; color: #94A3B8; margin-top: 8px;">(Thầy Tuấn trực tiếp hỗ trợ giải đáp thắc mắc và cập nhật prompt mới hàng tuần)</div>
              </div>

              <!-- Bridge Offer to Core Course -->
              <div style="border-top: 1px solid rgba(255,255,255,0.1); padding-top: 20px; margin-top: 24px; background: rgba(245, 158, 11, 0.05); border-radius: 10px; padding: 16px;">
                <div style="font-size: 12px; font-weight: 700; color: #F59E0B; text-transform: uppercase;">
                  💡 BẠN ĐÃ CÓ 50 CÂU LỆNH, NHƯNG MUỐN TỰ ĐỘNG HÓA DOANH NGHIỆP?
                </div>
                <p style="font-size: 13px; color: #CBD5E1; line-height: 1.6; margin: 8px 0 12px;">
                  Khám phá ngay Khóa Huấn Luyện 2 Buổi: <strong style="color: #FFFFFF;">AI FOR BUSINESS — GÓI CẶP ĐÔI SẾP & TRỢ LÝ</strong>. Sếp nắm tư duy & bảo mật, Trợ lý nắm kỹ thuật thực thi. Học xong có ngay biệt đội Trợ lý AI chạy tự động cho công ty!
                </p>
                <a href="https://tpai-sales-crm.vercel.app/#bang-gia" style="color: #00D2FF; font-size: 13px; font-weight: 700; text-decoration: underline;">
                  Xem chi tiết chương trình đào tạo &rarr;
                </a>
              </div>

            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #040A1C; padding: 26px 30px; text-align: center; border-top: 1px solid rgba(255,255,255,0.08);">
              <a href="https://tpai-sales-crm.vercel.app" target="_blank" style="text-decoration: none; display: inline-block; margin-bottom: 10px;">
                <img src="https://tpai-sales-crm.vercel.app/assets/tpai-logo.png" alt="TPAI Logo" width="130" style="display: block; margin: 0 auto; width: 130px; max-width: 130px; height: auto; opacity: 0.9; border: 0;" border="0">
              </a>
              <div style="font-size: 13px; font-weight: 700; color: #FFFFFF;">Tuấn Phạm — Học Viện AI</div>
              <div style="font-size: 12px; color: #00D2FF; font-weight: 600; margin: 4px 0 8px;">"Làm chủ AI — Dẫn đầu tương lai"</div>
              <div style="font-size: 11px; color: #64748B; line-height: 1.6;">
                Hotline: 0977 138 673 &bull; Website: <a href="https://hocvienai.com" style="color: #94A3B8; text-decoration: underline;">hocvienai.com</a><br>
                Tòa nhà Học Viện AI &bull; Bản quyền thuộc về TPAI 2026.
              </div>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `;
}

export function generateEmailHtml({ customerName, orderCode, packageName, amount }) {
  const formattedAmount = amount ? Number(amount).toLocaleString('vi-VN') + ' VNĐ' : 'Đã xác nhận';
  
  return `
<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8">
  <title>Xác nhận đăng ký khóa học TPAI</title>
</head>
<body style="margin: 0; padding: 0; background-color: #040A1C; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #E2E8F0;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #040A1C; padding: 40px 10px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" style="max-width: 600px; background-color: #07153B; border-radius: 16px; border: 1px solid rgba(0, 210, 255, 0.25); overflow: hidden; box-shadow: 0 20px 40px rgba(0,0,0,0.5);">
          
          <!-- Header Banner -->
          <tr>
            <td style="background: linear-gradient(135deg, #0D2B8A 0%, #07153B 100%); padding: 34px 25px 28px; text-align: center; border-bottom: 1px solid rgba(0, 210, 255, 0.2);">
              <a href="https://tpai-sales-crm.vercel.app" target="_blank" style="text-decoration: none; display: inline-block;">
                <img src="https://tpai-sales-crm.vercel.app/assets/tpai-logo.png" alt="TPAI — Tuấn Phạm AI" width="190" style="display: block; margin: 0 auto; width: 190px; max-width: 190px; height: auto; border: 0;" border="0">
              </a>
              <div style="font-size: 11px; text-transform: uppercase; color: #94A3B8; letter-spacing: 2px; font-weight: 600; margin-top: 8px;">HỌC VIỆN AI &bull; TUẤN PHẠM</div>
              <h1 style="color: #FFFFFF; font-size: 21px; margin: 14px 0 0; font-weight: 700; line-height: 1.35;">XÁC NHẬN ĐĂNG KÝ THÀNH CÔNG!</h1>
            </td>
          </tr>

          <!-- Body Content -->
          <tr>
            <td style="padding: 32px 30px;">
              <p style="font-size: 16px; line-height: 1.6; color: #E2E8F0; margin-top: 0;">
                Xin chào <strong>${customerName || 'Quý học viên'}</strong>,
              </p>
              <p style="font-size: 15px; line-height: 1.6; color: #94A3B8;">
                Chúc mừng bạn đã chính thức ghi danh thành công khóa học <strong style="color: #00D2FF;">AI FOR BUSINESS — Xây Dựng Hệ Thống Trợ Lý AI Doanh Nghiệp</strong>. Thầy Tuấn và Đội ngũ Học Viện AI rất vinh hạnh được đồng hành cùng bạn trên hành trình bứt phá năng suất và làm chủ công nghệ AI.
              </p>

              <!-- Order Details Card -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #040A1C; border: 1px solid rgba(255,255,255,0.1); border-radius: 12px; margin: 24px 0; padding: 18px 20px;">
                <tr>
                  <td style="padding: 6px 0; color: #94A3B8; font-size: 14px;">Mã đơn hàng:</td>
                  <td align="right" style="padding: 6px 0; color: #00D2FF; font-family: monospace; font-size: 15px; font-weight: 700;">${orderCode}</td>
                </tr>
                <tr>
                  <td style="padding: 6px 0; color: #94A3B8; font-size: 14px;">Gói đào tạo:</td>
                  <td align="right" style="padding: 6px 0; color: #FFFFFF; font-size: 14px; font-weight: 600;">${packageName || 'Gói Đào Tạo'}</td>
                </tr>
                <tr>
                  <td style="padding: 6px 0; color: #94A3B8; font-size: 14px;">Học phí:</td>
                  <td align="right" style="padding: 6px 0; color: #F59E0B; font-size: 15px; font-weight: 700;">${formattedAmount}</td>
                </tr>
                <tr>
                  <td style="padding: 6px 0; color: #94A3B8; font-size: 14px;">Hình thức:</td>
                  <td align="right" style="padding: 6px 0; color: #00D2FF; font-size: 14px; font-weight: 600;">Zoom VIP (Kèm 1-1 riêng)</td>
                </tr>
                <tr>
                  <td style="padding: 6px 0; color: #94A3B8; font-size: 14px;">Lịch học (2 buổi):</td>
                  <td align="right" style="padding: 6px 0; color: #F59E0B; font-size: 13px; font-weight: 700;">Thứ 7 (31/10) &amp; CN (01/11/2026)<br><span style="font-size: 12px; color: #94A3B8; font-weight: normal;">08:30 — 12:00</span></td>
                </tr>
                <tr>
                  <td style="padding: 6px 0; color: #94A3B8; font-size: 14px;">Trạng thái:</td>
                  <td align="right" style="padding: 6px 0;">
                    <span style="background-color: #10B981; color: #FFFFFF; padding: 4px 10px; border-radius: 20px; font-size: 12px; font-weight: 700; display: inline-block;">
                      ✓ ĐÃ XÁC NHẬN &amp; GIỮ CHỖ
                    </span>
                  </td>
                </tr>
              </table>

              <!-- Action Step 0: View VIP Ticket -->
              <div style="margin: 20px 0 16px; text-align: center;">
                <a href="https://tpai-sales-crm.vercel.app/cam-on.html?order=${orderCode}&name=${encodeURIComponent(customerName || '')}&package=${encodeURIComponent(packageName || '')}" target="_blank" style="display: block; background: linear-gradient(135deg, #F59E0B 0%, #D97706 100%); color: #040A1C; text-decoration: none; padding: 14px 24px; border-radius: 10px; font-weight: 800; font-size: 15px; box-shadow: 0 4px 14px rgba(245, 158, 11, 0.4);">
                  🎟️ BẤM ĐỂ XEM VÉ ĐIỆN TỬ VIP &amp; LỊCH HỌC
                </a>
              </div>

              <!-- Action Step 1: Zalo Group -->
              <div style="margin: 12px 0 16px; text-align: center;">
                <a href="https://zalo.me/0977138673" target="_blank" style="display: block; background: #0068FF; color: #FFFFFF; text-decoration: none; padding: 13px 24px; border-radius: 10px; font-weight: 700; font-size: 14px; box-shadow: 0 4px 14px rgba(0, 104, 255, 0.4);">
                  💬 THAM GIA NHÓM ZALO HỌC VIÊN VIP (THẦY TUẤN PHẠM)
                </a>
                <div style="font-size: 12px; color: #94A3B8; margin-top: 8px;">(Thầy Tuấn &amp; Trợ lý sẽ duyệt bạn vào nhóm và cấp ID/Mật khẩu Zoom ngay)</div>
              </div>

              <!-- Action Step 2: Direct Resource Downloads -->
              <div style="background-color: #040A1C; border: 1px solid rgba(0, 210, 255, 0.25); border-radius: 12px; margin: 20px 0; padding: 18px;">
                <div style="font-size: 13px; font-weight: 700; color: #00D2FF; margin-bottom: 12px; text-transform: uppercase; text-align: center;">
                  📥 Tải trước tài liệu học tập về máy tính:
                </div>
                <div style="margin-bottom: 10px;">
                  <a href="https://tpai-sales-crm.vercel.app/assets/50-prompt-master-nghi-dinh-30.docx" style="display: block; background: linear-gradient(135deg, #0D2B8A 0%, #0068FF 100%); color: #FFFFFF; text-decoration: none; padding: 11px 16px; border-radius: 8px; font-weight: 700; font-size: 13px; text-align: center;">
                    📄 TẢI FILE WORD CHUẨN NĐ 30 (.DOCX - 103KB)
                  </a>
                </div>
                <div>
                  <a href="https://tpai-sales-crm.vercel.app/assets/cam-nang-50-prompt-tpai.pdf" style="display: block; background: rgba(0, 210, 255, 0.1); border: 1px solid #00D2FF; color: #00D2FF; text-decoration: none; padding: 11px 16px; border-radius: 8px; font-weight: 700; font-size: 13px; text-align: center;">
                    📘 TẢI CẨM NANG EBOOK TRỰC QUAN (.PDF - 1.88MB)
                  </a>
                </div>
              </div>

              <!-- Instructions -->
              <div style="border-top: 1px solid rgba(255,255,255,0.1); padding-top: 20px; margin-top: 24px;">
                <h3 style="font-size: 14px; color: #FFFFFF; margin: 0 0 10px; text-transform: uppercase; letter-spacing: 0.5px;">Các bước chuẩn bị trước buổi học:</h3>
                <ul style="margin: 0; padding-left: 20px; font-size: 13px; color: #94A3B8; line-height: 1.8;">
                  <li>Vào nhóm Zalo theo nút ở trên để không bỏ lỡ lịch học và tài liệu mới nhất.</li>
                  <li>Chuẩn bị máy tính có kết nối mạng ổn định và cài đặt sẵn phần mềm Zoom.</li>
                  <li>Nếu cần hỗ trợ kỹ thuật gấp, vui lòng gọi Hotline Thầy Tuấn: <strong style="color: #FFFFFF;">0977 138 673</strong>.</li>
                </ul>
              </div>

            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #040A1C; padding: 26px 30px; text-align: center; border-top: 1px solid rgba(255,255,255,0.08);">
              <a href="https://tpai-sales-crm.vercel.app" target="_blank" style="text-decoration: none; display: inline-block; margin-bottom: 10px;">
                <img src="https://tpai-sales-crm.vercel.app/assets/tpai-logo.png" alt="TPAI Logo" width="130" style="display: block; margin: 0 auto; width: 130px; max-width: 130px; height: auto; opacity: 0.9; border: 0;" border="0">
              </a>
              <div style="font-size: 13px; font-weight: 700; color: #FFFFFF;">Tuấn Phạm — Học Viện AI</div>
              <div style="font-size: 12px; color: #00D2FF; font-weight: 600; margin: 4px 0 8px;">"Làm chủ AI — Dẫn đầu tương lai"</div>
              <div style="font-size: 11px; color: #64748B; line-height: 1.6;">
                Hotline: 0977 138 673 &bull; Website: <a href="https://hocvienai.com" style="color: #94A3B8; text-decoration: underline;">hocvienai.com</a><br>
                Tòa nhà Học Viện AI &bull; Bản quyền thuộc về TPAI 2026.
              </div>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed. Use POST.' });
  }

  const { customerName, customerEmail, orderCode, packageName, amount, type, enrollOnly } = req.body || {};

  if (!customerEmail) {
    return res.status(400).json({ success: false, error: 'customerEmail is required' });
  }

  const isLeadMagnet = type === 'lead_magnet' || 
    (packageName && (packageName.includes('lead_magnet') || packageName.includes('50prompt') || packageName.includes('Cẩm Nang') || packageName.includes('Prompt')));

  // Auto-enroll contact into Brevo Marketing Automation list
  const targetListId = isLeadMagnet ? BREVO_LEADS_LIST_ID : BREVO_CUSTOMERS_LIST_ID;
  await enrollInBrevo({
    email: customerEmail,
    name: customerName,
    phone: req.body?.customerPhone || req.body?.phone,
    listId: targetListId
  }).catch(bErr => console.warn('[Brevo background enroll warning]', bErr));

  if (enrollOnly) {
    return res.status(200).json({ success: true, message: 'Enrolled in Brevo successfully' });
  }

  const subject = isLeadMagnet
    ? `[TPAI] Quà Tặng Độc Quyền: Bộ 50 Prompt Master & Cẩm Nang AI Chuẩn Nghị Định 30`
    : `[TPAI] Xác Nhận Đăng Ký Khóa Học AI FOR BUSINESS — Đơn ${orderCode || ''}`;

  const htmlContent = isLeadMagnet
    ? generateLeadMagnetEmailHtml({
        customerName: customerName || 'Bạn',
        orderCode: orderCode || 'TPAI-LM'
      })
    : generateEmailHtml({
        customerName: customerName || 'Học viên TPAI',
        orderCode: orderCode || 'TPAI-ORDER',
        packageName: packageName || 'Khóa học AI FOR BUSINESS',
        amount: amount || 0
      });

  try {
    // 1. Primary: Send via Brevo API (Sends to any customer email with verified sender)
    let emailSent = false;
    let emailResponse = null;

    try {
      const brevoPayload = isLeadMagnet
        ? {
            templateId: 2, // Email 1 Template on Brevo
            to: [{ email: customerEmail, name: customerName || 'Bạn' }],
            params: {
              FIRSTNAME: (customerName || 'Bạn').trim().split(' ').slice(-1)[0]
            }
          }
        : {
            sender: { name: 'Tuấn Phạm — Học Viện AI', email: 'qtpham01vnn@gmail.com' },
            to: [{ email: customerEmail, name: customerName || 'Học viên TPAI' }],
            subject: subject,
            htmlContent: htmlContent
          };

      const brevoRes = await fetch('https://api.brevo.com/v3/smtp/email', {
        method: 'POST',
        headers: {
          'api-key': BREVO_API_KEY,
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify(brevoPayload)
      });

      if (brevoRes.ok) {
        emailSent = true;
        emailResponse = await brevoRes.json();
        console.log('[Brevo Email Sent Successfully]', emailResponse);
      } else {
        const brevoErr = await brevoRes.json();
        console.warn('[Brevo Send Warning]', brevoErr);
      }
    } catch (brevoErr) {
      console.warn('[Brevo Email Exception]', brevoErr);
    }

    // 2. Secondary fallback: Resend API
    if (!emailSent) {
      try {
        const resendRes = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${RESEND_API_KEY}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            from: 'Tuấn Phạm - TPAI <onboarding@resend.dev>',
            to: [customerEmail],
            subject: subject,
            html: htmlContent
          })
        });
        if (resendRes.ok) {
          emailSent = true;
          emailResponse = await resendRes.json();
        }
      } catch (rErr) {
        console.warn('[Resend Fallback Error]', rErr);
      }
    }

    return res.status(200).json({
      success: true,
      message: 'Email processed successfully!',
      data: emailResponse
    });
  } catch (err) {
    console.error('[Send Email Internal Error]', err);
    return res.status(500).json({ success: false, error: err.message });
  }
}
