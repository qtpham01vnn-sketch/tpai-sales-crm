// Vercel Serverless Function — TPAI Omnichannel Campaign Sync API
// Endpoint: /api/orchestrator/campaign
// Đồng bộ Chiến dịch từ 13 AI Agents lên Landing Page (index.html) & Kênh Truyền Thông (Facebook / Telegram)

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://yvwsitkgpujeqlgeiuge.supabase.co';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl2d3NpdGtncHVqZXFsZ2VpdWdlIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc5MDkyNjAxOCwiZXhwIjoyMTA2NTAyMDE4fQ.lh_tkghK0Yja3gAwhI2LnUiG1HYQL2SwU3BSE21DRKg';

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || '8555166604:AAGA9isNIFE_OygVvrZVTpSrgF3ZmenYmRQ';
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID || '6409390739';

// TuanPham AI Gateway (Chuẩn Quy Tắc Nội Bộ)
const GATEWAY_BASE_URL = 'http://localhost:20128/v1';
const GATEWAY_API_KEY = 'tuanpham_gateway_2026';
const GATEWAY_MODEL = 'auto-smart';

async function getSupabaseSetting(key, fallbackValue = null) {
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/tpai_settings?key=eq.${encodeURIComponent(key)}&select=*`, {
      headers: {
        'apikey': SUPABASE_SERVICE_KEY,
        'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`
      }
    });
    if (res.ok) {
      const rows = await res.json();
      if (Array.isArray(rows) && rows.length > 0 && rows[0].value) {
        return rows[0].value;
      }
    }
  } catch (err) {
    console.warn(`[Get Setting ${key} Warning]`, err.message);
  }
  return fallbackValue;
}

async function saveSupabaseSetting(key, valueObj) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/tpai_settings`, {
    method: 'POST',
    headers: {
      'apikey': SUPABASE_SERVICE_KEY,
      'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
      'Content-Type': 'application/json',
      'Prefer': 'resolution=merge-duplicates,return=representation'
    },
    body: JSON.stringify({
      key: key,
      value: valueObj,
      updated_at: new Date().toISOString()
    })
  });
  return res.ok;
}

// Hàm sinh thông điệp đồng bộ chiến dịch giữa Landing Page & Bài đăng mạng xã hội
async function generateCampaignPackage(rawIdea) {
  const ideaClean = String(rawIdea || '').trim();

  // Thử gọi AI Gateway nếu có
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 4000);

    const response = await fetch(`${GATEWAY_BASE_URL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${GATEWAY_API_KEY}`
      },
      body: JSON.stringify({
        model: GATEWAY_MODEL,
        messages: [
          {
            role: 'system',
            content: `Bạn là Coach Agent và Sale Funnel Agent của TPAI. Hãy chuyển đổi ý tưởng sau thành bộ chiến dịch đồng bộ gồm:
1. headline_line1: Dòng 1 tiêu đề Landing Page (ngắn, giật gân, font to)
2. headline_line2: Dòng 2 tiêu đề Landing Page (nhấn mạnh giải pháp hoặc đối tượng)
3. subheadline: Mô tả ngắn 2-3 câu làm rõ giá trị cho doanh nghiệp
4. badge: Tên badge ngắn (VD: CHIẾN DỊCH NGHỊ ĐỊNH 30)
5. fb_title: Tiêu đề bài đăng Facebook
6. fb_post: Toàn bộ bài đăng Facebook chuẩn TPAI có bullet, emoji, hotline, link https://tpai-sales-crm.vercel.app
Trả về định dạng JSON thuần với các trường trên.`
          },
          {
            role: 'user',
            content: `Ý tưởng chiến dịch của Thầy Tuấn: "${ideaClean}"`
          }
        ]
      }),
      signal: controller.signal
    });
    clearTimeout(timeout);

    if (response.ok) {
      const json = await response.json();
      const content = json.choices?.[0]?.message?.content;
      if (content) {
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]);
          return parsed;
        }
      }
    }
  } catch (_) {}

  // Fallback Rule-based thông minh dựa theo từ khóa chiến dịch của TPAI
  const isNd30 = /nghị định|nghi dinh|công văn|cong van|văn bản|van ban/i.test(ideaClean);
  const isExcel = /excel|báo cáo|bao cao|số liệu|so lieu/i.test(ideaClean);
  const isInHouse = /inhouse|in-house|1:1|tư vấn|tu van/i.test(ideaClean);

  if (isNd30) {
    return {
      title: 'Chiến Dịch: Tự Động Hóa Soạn Thảo Văn Bản Chuẩn Nghị Định 30',
      badge: 'CHIẾN DỊCH NGHỊ ĐỊNH 30',
      headline_line1: 'Sếp Ra Lệnh 30 Giây Bằng Voice Note',
      headline_line2: 'AI Biên Soạn Chuẩn 100% Nghị Định 30',
      headline_line3: 'Giải Phóng 80% Giờ Làm Sự Vụ Cho Trợ Lý!',
      subheadline: 'Hệ thống tự động hóa văn bản hành chính theo tiêu chuẩn TCVN Nghị định số 30/2020/NĐ-CP. Sếp không còn lo sai font Times New Roman, lệch lề 30-15-20-20mm hay văn bản bị trả về!',
      cta_text: 'NHẬN BỘ 50 PROMPT NGHỊ ĐỊNH 30',
      gift_text: 'Tặng miễn phí File Word chuẩn NĐ 30 & Ebook PDF 12 Slide 16:9',
      fb_title: 'Case Study: Trợ lý soạn Công văn chuẩn Nghị định 30 trong 5 phút',
      media_type: 'image_card',
      media_url: '/assets/card-nd30.png',
      fb_post: `🚀 [CHIẾN DỊCH ĐẶC BIỆT] TỰ ĐỘNG HÓA SOẠN THẢO VĂN BẢN CHUẨN NGHỊ ĐỊNH 30

Nhiều sếp và chủ doanh nghiệp tâm sự với tôi:
"Nhân viên mất cả buổi chiều làm công văn, tờ trình... nộp lên vẫn sai font Times New Roman, lệch lề, sai thể thức hành chính!"

⚡ GIẢI PHÁP TPAI CẶP ĐÔI (5 PHÚT HOÀN THÀNH — CHUẨN 100% NĐ 30):
1️⃣ Sếp ra lệnh 30 giây bằng Voice Note.
2️⃣ AI tự động biên soạn chuẩn thể thức TCVN Nghị định số 30/2020/NĐ-CP (lề 30-15-20-20mm).
3️⃣ Trợ lý kiểm tra & trình ký trong 5 phút.

🎁 ĐÃ ĐỒNG BỘ TRỰC TIẾP TRÊN HỆ THỐNG LANDING PAGE:
👉 Khám phá và nhận ngay tài liệu tại: https://tpai-sales-crm.vercel.app

Tuấn Phạm — Học Viện AI
"Làm chủ AI — Dẫn đầu tương lai"
Hotline/Zalo: 0977.138.673
#TPAI #TuanPhamAI #HocVienAI #NghiDinh30 #50PromptMaster`
    };
  }

  if (isExcel) {
    return {
      title: 'Chiến Dịch: Tự Động Hóa Báo Cáo Excel & Họp Giao Ban',
      badge: 'TỰ ĐỘNG HÓA BÁO CÁO EXCEL',
      headline_line1: 'Bảng Tính Hàng Ngàn Dòng Số Liệu',
      headline_line2: 'Tóm Tắt Báo Cáo Họp Giao Ban Trong 60 Giây',
      headline_line3: 'Bằng Bộ Não Số NotebookLM Nội Bộ!',
      subheadline: 'Không còn cảnh số liệu phòng kinh doanh một kiểu, kế toán một nẻo. AI tự động vẽ biểu đồ xu hướng, phát hiện điểm bất thường và trích xuất 3 quyết định trọng tâm cho Sếp!',
      cta_text: 'KHÁM PHÁ QUY TRÌNH EXCEL AI',
      gift_text: 'Tặng 8 Prompt tự động hóa bảng tính & Kịch bản họp giao ban',
      fb_title: 'Reels B-Roll: 8 Tuyệt chiêu tự động hóa báo cáo Excel & Họp giao ban',
      media_type: 'video_reels',
      media_url: '/assets/content/reels-8prompts.mp4',
      thumbnail_url: '/assets/content/card-reels-8prompts.png',
      fb_post: `⚡ [CHIẾN DỊCH NỔI BẬT] 8 TUYỆT CHIÊU TỰ ĐỘNG HÓA BÁO CÁO EXCEL & HỌP GIAO BAN

Mỗi kỳ họp giao ban đầu tuần, ai cũng ngán ngẩm cảnh:
- Số liệu phòng kinh doanh một kiểu, kế toán một nẻo.
- Báo cáo gửi sếp là bảng tính Excel hàng ngàn dòng không thể đọc nổi insight!

Đây là cách TPAI xử lý:
1. Nạp file Excel thô vào Bộ não số NotebookLM nội bộ.
2. AI tự động vẽ biểu đồ xu hướng, phát hiện điểm bất thường và trích xuất 3 quyết định trọng tâm.
3. Tạo slide báo cáo trực quan trong 3 phút.

👉 Xem giải pháp thực tế tại Landing Page: https://tpai-sales-crm.vercel.app

Tuấn Phạm — Học Viện AI
"Làm chủ AI — Dẫn đầu tương lai"
Hotline/Zalo: 0977.138.673
#TPAI #TuanPhamAI #ExcelAutomation #BaoCaoGiaoBan #NotebookLM`
    };
  }

  // Mặc định tổng quát hóa từ ý tưởng của Thầy
  return {
    title: ideaClean.length > 50 ? `${ideaClean.slice(0, 48)}...` : ideaClean,
    badge: 'CHIẾN DỊCH TIÊU ĐIỂM HÔM NAY',
    headline_line1: ideaClean.slice(0, 40),
    headline_line2: 'Tự Động Hóa Thực Chiến Cùng Đội Ngũ AI TPAI',
    headline_line3: 'Đột Phá Năng Suất Vận Hành Doanh Nghiệp!',
    subheadline: `Chiến dịch mới được chỉ đạo trực tiếp từ Thầy Tuấn Phạm: "${ideaClean}". Đồng bộ hóa toàn diện giữa truyền thông mạng xã hội và hệ thống Landing Page bán hàng.`,
    cta_text: 'ĐĂNG KÝ VÉ CẶP ĐÔI (9.9M)',
    gift_text: 'Tặng trọn bộ 50 Prompt Master & Cẩm nang chuyển đổi số',
    fb_title: `Chiến dịch TPAI: ${ideaClean}`,
    media_type: 'image_card',
    media_url: '/assets/card-nd30.png',
    fb_post: `🚀 [CHIẾN DỊCH MỚI] ${ideaClean.toUpperCase()}

Trong quá trình tư vấn và triển khai AI thực chiến cho hàng trăm doanh nghiệp SME, tôi nhận thấy một sự thật:
Các sếp không hề thiếu công cụ AI, thứ các sếp thiếu là một QUY TRÌNH ĐỒNG BỘ giữa Sếp (Người ra đề bài) và Trợ lý (Người đóng gói thực thi).

💡 3 BƯỚC ĐỂ ÁP DỤNG NGAY HÔM NAY TẠI DOANH NGHIỆP CỦA BẠN:
1️⃣ Chuẩn hóa dữ liệu nội bộ lên Bộ não số Google NotebookLM (Bảo mật 100%, không rò rỉ dữ liệu mật).
2️⃣ Áp dụng cấu trúc lệnh R-C-T-C-F để rút ngắn 80% thời gian xử lý sự vụ.
3️⃣ Thiết lập mô hình Cặp Đôi Chiến Lược: Sếp chỉ đạo 30 giây — Trợ lý vận hành hệ thống AI Agent hoàn thành trong 5 phút.

👉 Khám phá nội dung chiến dịch trực tiếp trên Landing Page: https://tpai-sales-crm.vercel.app

Tuấn Phạm — Học Viện AI
"Làm chủ AI — Dẫn đầu tương lai"
Hotline/Zalo: 0977.138.673
#TPAI #TuanPhamAI #HocVienAI #AIForBusiness #LamChuAI`
  };
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'content-type');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');

  if (req.method === 'OPTIONS') {
    return res.status(200).json({});
  }

  try {
    // 1. GET: Lấy chiến dịch đang kích hoạt
    if (req.method === 'GET') {
      const campaign = await getSupabaseSetting('active_campaign', { active: false });
      return res.status(200).json({
        success: true,
        campaign: campaign || { active: false }
      });
    }

    // 2. POST: Thao tác chiến dịch
    if (req.method === 'POST') {
      const body = req.body || {};
      const { action } = body;

      // 2.1: Khôi phục Landing Page về Hero Mặc Định
      if (action === 'reset') {
        const resetData = { active: false, updated_at: new Date().toISOString() };
        await saveSupabaseSetting('active_campaign', resetData);
        return res.status(200).json({
          success: true,
          message: 'Đã đưa Landing Page về giao diện Hero Gốc thành công!',
          campaign: resetData
        });
      }

      // 2.2: Kích hoạt Chiến dịch mới từ Kịch bản Thầy nhập (Sinh bài FB + Cập nhật Landing Page)
      if (action === 'dispatch_campaign') {
        const { idea, scheduled_slot = '06:30' } = body;
        if (!idea || !String(idea).trim()) {
          return res.status(400).json({ success: false, error: 'Vui lòng nhập kịch bản hoặc ý tưởng chiến dịch!' });
        }

        const pkg = await generateCampaignPackage(idea);
        const isEvening = scheduled_slot === '18:30';
        const finalMediaType = pkg.media_type || (isEvening ? 'video_reels' : 'image_card');
        const finalMediaUrl = finalMediaType === 'video_reels'
          ? (pkg.media_url || '/assets/content/reels-50prompt.mp4')
          : (pkg.media_url || '/assets/card-nd30.png');
        const finalThumb = finalMediaType === 'video_reels'
          ? '/assets/content/card-reels-50prompt.png'
          : finalMediaUrl;

        // Lưu active_campaign lên Supabase để Landing Page tải động
        const campaignData = {
          active: true,
          title: pkg.title,
          badge: pkg.badge,
          headline_line1: pkg.headline_line1,
          headline_line2: pkg.headline_line2,
          headline_line3: pkg.headline_line3,
          subheadline: pkg.subheadline,
          cta_text: pkg.cta_text || 'ĐĂNG KÝ VÉ CẶP ĐÔI (9.9M)',
          gift_text: pkg.gift_text,
          media_type: finalMediaType,
          media_url: finalMediaUrl,
          updated_at: new Date().toISOString()
        };
        await saveSupabaseSetting('active_campaign', campaignData);

        // Đưa bài viết tương ứng vào Hàng đợi xuất bản mạng xã hội (Facebook / Telegram)
        let queueData = await getSupabaseSetting('content_queue', { items: [] });
        let items = Array.isArray(queueData.items) ? queueData.items : [];

        const newQueueItem = {
          id: `campaign-${Date.now()}`,
          topic_title: pkg.fb_title || pkg.title,
          angle: `Chiến Dịch: ${pkg.badge}`,
          content_text: pkg.fb_post,
          media_type: finalMediaType,
          media_url: finalMediaUrl,
          thumbnail_url: finalThumb,
          target_channels: ['facebook', 'telegram', 'zalo'],
          scheduled_slot: scheduled_slot,
          scheduled_at: new Date().toISOString(),
          status: 'approved',
          agents_chain: ['Coach Agent', 'Offer Agent', 'Sale Funnel Agent', 'Post Content Agent', 'Brand Agent'],
          created_at: new Date().toISOString()
        };

        items = [newQueueItem, ...items];
        await saveSupabaseSetting('content_queue', { items });

        // Gửi thông báo Telegram cho Thầy Tuấn
        try {
          const teleText = `🎯 <b>[KÍCH HOẠT CHIẾN DỊCH TOÀN KÊNH THÀNH CÔNG]</b>
━━━━━━━━━━━━━━━━━━━━
📌 <b>Tên Chiến Dịch:</b> <b>${pkg.title}</b>
🏷️ <b>Huy hiệu:</b> <code>${pkg.badge}</code>
⏰ <b>Khung giờ lên sóng:</b> <code>${scheduled_slot} Hôm nay</code>
🎬 <b>Định dạng Visual:</b> <code>${finalMediaType === 'video_reels' ? 'Video Reels 9:16 (MP4)' : 'Ảnh Card Thiết Kế (PNG)'}</code>
━━━━━━━━━━━━━━━━━━━━
🌐 <b>ĐÃ ĐỒNG BỘ TRỰC TIẾP LÊN LANDING PAGE:</b>
H1: <i>${pkg.headline_line1} — ${pkg.headline_line2}</i>
━━━━━━━━━━━━━━━━━━━━
👉 <a href="https://tpai-sales-crm.vercel.app">Xem Landing Page Đã Cập Nhật</a> | <a href="https://tpai-sales-crm.vercel.app/crm">Vào CRM Duyệt</a>`;

          await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              chat_id: TELEGRAM_CHAT_ID,
              text: teleText,
              parse_mode: 'HTML',
              disable_web_page_preview: false
            })
          });
        } catch (_) {}

        return res.status(200).json({
          success: true,
          message: 'Đã kích hoạt chiến dịch! Landing Page & Hàng đợi Facebook đã đồng bộ 100%!',
          campaign: campaignData,
          queueItem: newQueueItem
        });
      }

      return res.status(400).json({ success: false, error: 'Action không hợp lệ.' });
    }

    return res.status(405).json({ success: false, error: 'Method not allowed' });
  } catch (err) {
    console.error('[Campaign API Error]', err);
    return res.status(500).json({ success: false, error: err.message });
  }
}
