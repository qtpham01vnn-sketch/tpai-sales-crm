// Vercel Serverless Function — TPAI AI Command Center & 13-Agent Orchestrator API
// Endpoint: /api/orchestrator/command
// Phối hợp 1 Coach Agent (Chỉ Huy L2) + 12 Worker Agents & Quản lý Hàng Đợi Xuất Bản (06:30 & 18:30)

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://yvwsitkgpujeqlgeiuge.supabase.co';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl2d3NpdGtncHVqZXFsZ2VpdWdlIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc5MDkyNjAxOCwiZXhwIjoyMTA2NTAyMDE4fQ.lh_tkghK0Yja3gAwhI2LnUiG1HYQL2SwU3BSE21DRKg';

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || '8555166604:AAGA9isNIFE_OygVvrZVTpSrgF3ZmenYmRQ';
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID || '6409390739';

// TuanPham AI Gateway Configuration (Chuẩn Quy Tắc Nội Bộ)
const GATEWAY_BASE_URL = 'http://localhost:20128/v1';
const GATEWAY_API_KEY = 'tuanpham_gateway_2026';
const GATEWAY_MODEL = 'auto-smart';

// Danh sách 13 AI Agents chính thức trong hệ sinh thái TPAI
export const TPAI_AGENTS_ROSTER = [
  { id: 'coach', name: 'Coach Agent (Chỉ Huy L2)', role: 'Tổng chỉ huy chiến lược, điều phối 12 Agent & kiểm duyệt KCS', group: 'commander', status: 'ready', icon: 'crown' },
  { id: 'offer', name: '1. Offer Agent', role: 'Nghiên cứu thị trường, phân tích nỗi đau & đóng gói Combo', group: 'strategy', status: 'ready', icon: 'package-check' },
  { id: 'brand', name: '2. Brand Agent', role: 'Giám sát nhận diện TPAI, Logo Mẫu 1, Slogan & Bảng màu', group: 'strategy', status: 'ready', icon: 'shield-check' },
  { id: 'analysis', name: '3. Analysis Agent', role: 'Phân tích dữ liệu chuyển đổi, ROAS & tối ưu chủ đề', group: 'strategy', status: 'ready', icon: 'bar-chart-3' },
  { id: 'post-content', name: '4. Post Content Agent', role: 'Viết bài Facebook/LinkedIn chuẩn 5 Angles & Card Playwright', group: 'content', status: 'ready', icon: 'file-text' },
  { id: 'simple-reels', name: '5. TPAI Reels Agent', role: 'Sản xuất Video 9:16 Pexels B-Roll, ElevenLabs & Kinetic', group: 'content', status: 'ready', icon: 'clapperboard' },
  { id: 'ads-content', name: '6. Ads Content Agent', role: '10 Variations Ad Copy, Creative Brief & Lookalike', group: 'content', status: 'ready', icon: 'megaphone' },
  { id: 'lead-magnet', name: '7. Lead Magnet Agent', role: 'Biên soạn 50 Prompt chuẩn Nghị định 30 (.docx & .pdf)', group: 'content', status: 'ready', icon: 'book-open' },
  { id: 'leads-funnel', name: '8. Leads Funnel Agent', role: 'Tối ưu trang Opt-in thu thập Leads & chuỗi Email 7 ngày', group: 'conversion', status: 'ready', icon: 'magnet' },
  { id: 'sale-funnel', name: '9. Sale Funnel Agent', role: 'Tối ưu Landing Page V2.0, Price Framing & Bẻ gãy nỗi sợ', group: 'conversion', status: 'ready', icon: 'zap' },
  { id: 'booking-funnel', name: '10. Booking Funnel Agent', role: 'Phễu đặt lịch tư vấn 1:1 Rainmaker & Kịch bản Closer 30m', group: 'conversion', status: 'ready', icon: 'calendar-check' },
  { id: 'sale-dm', name: '11. Sale DM Agent', role: '15 FAQ, 10 Xử lý từ chối & Kịch bản chốt đơn Zalo/Inbox', group: 'conversion', status: 'ready', icon: 'message-Square-more' },
  { id: 'crm-affiliate', name: '12. CRM & Affiliate Agent', role: 'Quản trị Leads, VietinBank VietQR, SePay & Cấp quyền', group: 'conversion', status: 'ready', icon: 'users' }
];

// Danh sách Chủ đề Gợi ý Thông minh (Dành cho Chế độ 2: Co-Pilot Chọn theo gợi ý)
export const SUGGESTED_TOPICS = [
  {
    id: 'topic-nd30-cong-van',
    title: 'Case Study: Trợ lý soạn Công văn chuẩn Nghị định 30 trong 5 phút',
    angle: 'Case Study & Lead Magnet',
    media_type: 'image_card',
    media_url: '/assets/content/card-nd30.png',
    agents_involved: ['coach', 'post-content', 'lead-magnet', 'brand']
  },
  {
    id: 'topic-reels-50prompt',
    title: 'Reels 9:16: 5 Câu lệnh Prompt quyền lực nhất cho Sếp & Trợ lý',
    angle: 'Outcome & Viral Reels',
    media_type: 'video_reels',
    media_url: '/assets/content/reels-50prompt.mp4',
    thumbnail_url: '/assets/content/card-reels-50prompt.png',
    agents_involved: ['coach', 'simple-reels', 'lead-magnet', 'sale-dm']
  },
  {
    id: 'topic-sep-di-hoc-1-minh',
    title: 'Nỗi đau: Sếp đi học một mình về không ai làm — Nhân viên học về sếp không duyệt',
    angle: 'Pain & Combo Solution',
    media_type: 'video_reels',
    media_url: '/assets/course-video.mp4',
    thumbnail_url: '/assets/course-hero.png',
    agents_involved: ['coach', 'offer', 'sale-funnel', 'simple-reels']
  },
  {
    id: 'topic-reels-8prompts',
    title: 'Reels B-Roll: 8 Tuyệt chiêu tự động hóa báo cáo Excel & Họp giao ban',
    angle: 'Outcome & Efficiency',
    media_type: 'video_reels',
    media_url: '/assets/content/reels-8prompts.mp4',
    thumbnail_url: '/assets/content/card-reels-8prompts.png',
    agents_involved: ['coach', 'simple-reels', 'post-content', 'brand']
  },
  {
    id: 'topic-cost-of-inaction',
    title: 'Phân tích tài chính: Cái giá 35.000.000đ/tháng của việc làm thủ công',
    angle: 'Price Anchor & Contrarian',
    media_type: 'image_card',
    media_url: '/assets/course-hero.png',
    agents_involved: ['coach', 'analysis', 'ads-content', 'sale-funnel']
  },
  {
    id: 'topic-booking-1on1',
    title: 'Mời ứng tuyển Phiên Tư Vấn Chiến Lược AI Doanh Nghiệp 1:1 (Gói In-House)',
    angle: 'High-Ticket Rainmaker',
    media_type: 'image_card',
    media_url: '/assets/handbook-preview.png',
    agents_involved: ['coach', 'booking-funnel', 'sale-dm', 'brand']
  }
];

// Cấu hình mặc định của Trung tâm Chỉ huy
const DEFAULT_ORCHESTRATOR_CONFIG = {
  frequency: 2,
  schedule_hours: ['06:30', '18:30'],
  channels: ['telegram', 'facebook', 'zalo', 'tiktok'],
  topic_mode: 'auto_pilot', // 'auto_pilot' hoặc 'co_pilot'
  approval_mode: 'telegram_copilot', // 'telegram_copilot' hoặc 'full_auto'
  fb_page_id: '809750085555882',
  fb_page_token: '',
  fb_webhook_url: '',
  telegram_channel_id: TELEGRAM_CHAT_ID,
  last_run_at: new Date().toISOString()
};

// Hàm tính toán các mốc giờ 06:30 sáng và 18:30 chiều tiếp theo
function getNextScheduleSlots(count = 4, hours = ['06:30', '18:30']) {
  const slots = [];
  const now = new Date();
  let dayOffset = 0;

  while (slots.length < count && dayOffset < 14) {
    for (const hm of hours) {
      const [h, m] = hm.split(':').map(Number);
      const candidate = new Date(now.getFullYear(), now.getMonth(), now.getDate() + dayOffset, h, m, 0);
      if (candidate > now || dayOffset > 0) {
        slots.push(candidate.toISOString());
        if (slots.length >= count) break;
      }
    }
    dayOffset++;
  }
  return slots;
}

// Khởi tạo Hàng đợi mẫu ban đầu từ dữ liệu thật của dự án TPAI
function buildInitialQueue() {
  const slots = getNextScheduleSlots(4, ['06:30', '18:30']);
  return [
    {
      id: 'queue-item-1',
      topic_title: '[CASE STUDY] Tại sao 1 Trợ lý của tôi xử lý khối lượng công văn của cả phòng 5 người?',
      angle: 'Case Study & Nghị Định 30',
      content_text: `[CASE STUDY] TẠI SAO 1 TRỢ LÝ CỦA TÔI CÓ THỂ XỬ LÝ KHỐI LƯỢNG CÔNG VĂN, BÁO CÁO CỦA CẢ MỘT PHÒNG BAN 5 NGƯỜI?

Hôm trước, ngồi cà phê với một người bạn là Giám đốc doanh nghiệp xây dựng, anh than thở:
"Tuấn ơi, công ty anh có 2 cô trợ lý mà lúc nào cũng thấy đầu bù tóc rối. Sếp bảo soạn cái công văn gửi chủ đầu tư từ sáng, đến 4 giờ chiều nộp lên vẫn sai font Times New Roman, căn lề lệch vẹo, trích yếu sai quy định!"

Tôi cười và bảo:
"Ở TPAI, toàn bộ công văn, tờ trình dự án, báo cáo tuần... trợ lý của tôi chỉ mất đúng 5 phút là xong trọn vẹn, chuẩn 100% Nghị định số 30/2020/NĐ-CP của Chính phủ."

⚡ MÔ HÌNH TPAI CẶP ĐÔI (Chỉ đúng 5 phút — X5 hiệu suất):
1. Sếp ra lệnh 30 giây qua Voice Note.
2. AI biên soạn tức thì chuẩn thể thức TCVN (lề 30-15-20-20mm).
3. Trợ lý kiểm tra & trình ký trong 5 phút.

🎁 TẶNG MIỄN PHÍ BỘ 50 PROMPT MASTER & FILE WORD NGHỊ ĐỊNH 30:
👉 Bình luận "PROMPT" hoặc tải ngay tại: https://tpai-sales-crm.vercel.app

Tuấn Phạm — Học Viện AI
"Làm chủ AI — Dẫn đầu tương lai"
Hotline/Zalo: 0977.138.673
#TPAI #TuanPhamAI #HocVienAI #NghiDinh30 #50PromptMaster`,
      media_type: 'image_card',
      media_url: '/assets/content/card-nd30.png',
      thumbnail_url: '/assets/content/card-nd30.png',
      target_channels: ['telegram', 'facebook', 'zalo'],
      scheduled_slot: '06:30',
      scheduled_at: slots[0],
      status: 'approved',
      agents_chain: ['Coach Agent', 'Offer Agent', 'Post Content Agent', 'Lead Magnet Agent', 'Brand Agent'],
      created_at: new Date().toISOString()
    },
    {
      id: 'queue-item-2',
      topic_title: '[REELS 9:16] Đừng mất hàng giờ soạn văn bản nữa nếu chưa biết 5 câu lệnh Prompt này!',
      angle: 'Viral Reels & Lead Magnet',
      content_text: `😱 ĐỪNG MẤT HÀNG GIỜ ĐỂ SOẠN VĂN BẢN NỮA NẾU CHƯA BIẾT ĐIỀU NÀY!

Nhiều sếp và chủ doanh nghiệp tâm sự với tôi: Nhân viên mất cả buổi chiều gõ một bản công văn, báo cáo hay tờ trình... nhưng nộp lên vẫn sai font, lệch lề, lủng củng hành văn.

Chỉ cần ứng dụng đúng phương pháp Prompting chuẩn R-C-T-C-F, AI có thể tự động soạn thảo toàn bộ văn bản hành chính theo đúng chuẩn 100% Nghị định 30/2020/NĐ-CP chỉ trong 30 giây!

🎁 TÔI DÀNH TẶNG MIỄN PHÍ CHO CÁC SẾP & TRỢ LÝ:
1. File Word (.docx) chuẩn 100% Nghị định 30/2020/NĐ-CP.
2. Ebook PDF 12 Slide 16:9 cẩm nang 50 Prompt cho 10 phòng ban.

👉 Bình luận chữ "PROMPT" hoặc nhận ngay tại: https://tpai-sales-crm.vercel.app

Tuấn Phạm — Học Viện AI
"Làm chủ AI — Dẫn đầu tương lai"
#TPAI #TuanPhamAI #HocVienAI #ReelsAI #50PromptMaster`,
      media_type: 'video_reels',
      media_url: '/assets/content/reels-50prompt.mp4',
      thumbnail_url: '/assets/content/card-reels-50prompt.png',
      target_channels: ['telegram', 'facebook', 'tiktok'],
      scheduled_slot: '18:30',
      scheduled_at: slots[1],
      status: 'approved',
      agents_chain: ['Coach Agent', 'TPAI Reels Agent', 'Lead Magnet Agent', 'Sale DM Agent'],
      created_at: new Date().toISOString()
    },
    {
      id: 'queue-item-3',
      topic_title: '[VIDEO ĐA CẢNH] Sếp đi học một mình về không ai làm — Nhân viên học về sếp không duyệt?',
      angle: 'Pain Angle & Combo 9.9M',
      content_text: `🔥 SẾP ĐI HỌC MỘT MÌNH VỀ KHÔNG AI LÀM — NHÂN VIÊN HỌC VỀ SẾP KHÔNG DUYỆT?

90% doanh nghiệp mua tài khoản ChatGPT Pro/Team về nhưng đắp chiếu bỏ xó vì đứt gãy giữa người chỉ đạo và người thực thi!

Đó là lý do tôi thiết kế khóa huấn luyện thực chiến: CẶP ĐÔI CHIẾN LƯỢC (Sếp & Trợ Lý Cùng Đi Học):
✅ Sếp Chỉ Đạo: Nắm tư duy điều hành, giao việc 30 giây & bảo mật dữ liệu nội bộ trên Google NotebookLM.
✅ Trợ Lý Thực Thi: Nắm kỹ thuật đóng gói Custom AI Agents & tự động hóa văn bản Nghị định 30.
✅ Chi phí đầu tư: Chỉ ~13.500đ/ngày/người (rẻ hơn 1 ly nước mía) nhưng tiết kiệm 35.000.000đ/tháng chi phí nhân sự lãng phí!

👉 Giữ chỗ ưu đãi Gói Cặp Đôi ngay tại: https://tpai-sales-crm.vercel.app

Tuấn Phạm — Học Viện AI
"Làm chủ AI — Dẫn đầu tương lai"
#TPAI #TuanPhamAI #AIForBusiness #CapDoiChienLuoc`,
      media_type: 'video_reels',
      media_url: '/assets/course-video.mp4',
      thumbnail_url: '/assets/course-hero.png',
      target_channels: ['telegram', 'facebook', 'zalo', 'tiktok'],
      scheduled_slot: '06:30',
      scheduled_at: slots[2],
      status: 'draft',
      agents_chain: ['Coach Agent', 'Offer Agent', 'Sale Funnel Agent', 'TPAI Reels Agent', 'Brand Agent'],
      created_at: new Date().toISOString()
    }
  ];
}

// Hàm sinh nội dung bài viết thông minh bằng TuanPham AI Gateway (kèm Fallback chuẩn TPAI)
async function generatePostWithAgents({ title, angle, mediaType }) {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3500);

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
            content: 'Bạn là Coach Agent điều phối 12 AI Agent của TPAI (Tuấn Phạm AI). Xưng "Tôi", gọi độc giả là "Bạn" hoặc "các sếp/chủ doanh nghiệp". Luôn kết thúc bằng chữ ký: Tuấn Phạm — Học Viện AI | "Làm chủ AI — Dẫn đầu tương lai" và link https://tpai-sales-crm.vercel.app'
          },
          {
            role: 'user',
            content: `Hãy viết 1 bài đăng mạng xã hội chuyển đổi cao về chủ đề: "${title}" theo góc tiếp cận "${angle || 'Thực chiến B2B'}".`
          }
        ]
      }),
      signal: controller.signal
    });
    clearTimeout(timeout);

    if (response.ok) {
      const json = await response.json();
      const generatedText = json.choices?.[0]?.message?.content;
      if (generatedText && generatedText.length > 50) {
        return generatedText;
      }
    }
  } catch (_) {
    // Fallback an toàn khi chạy trên môi trường Serverless Cloud
  }

  // Bản mẫu chuẩn 13 Agent TPAI khi chạy trên Cloud
  return `🚀 ${title.toUpperCase()}

Trong quá trình tư vấn và triển khai AI thực chiến cho hàng trăm doanh nghiệp SME, tôi nhận thấy một sự thật:
Các sếp không hề thiếu công cụ AI, thứ các sếp thiếu là một QUY TRÌNH ĐỒNG BỘ giữa Sếp (Người ra đề bài) và Trợ lý (Người đóng gói thực thi).

💡 3 BƯỚC ĐỂ ÁP DỤNG NGAY HÔM NAY TẠI DOANH NGHIỆP CỦA BẠN:
1️⃣ Chuẩn hóa dữ liệu nội bộ lên Bộ não số Google NotebookLM (Bảo mật 100%, không rò rỉ dữ liệu mật).
2️⃣ Áp dụng cấu trúc lệnh R-C-T-C-F và bộ 50 Prompt chuẩn Nghị định 30/2020/NĐ-CP để rút ngắn 80% thời gian làm báo cáo, công văn.
3️⃣ Thiết lập mô hình Cặp Đôi Chiến Lược: Sếp chỉ đạo 30 giây — Trợ lý vận hành hệ thống AI Agent hoàn thành trong 5 phút.

🎁 NHẬN NGAY BỘ TÀI LIỆU 50 PROMPT MASTER & ĐĂNG KÝ KHÓA THỰC CHIẾN:
👉 Truy cập cổng chính thức: https://tpai-sales-crm.vercel.app
👉 Hoặc đặt lịch tư vấn 1:1 In-House cùng tôi tại: https://tpai-sales-crm.vercel.app/dat-lich

Tuấn Phạm — Học Viện AI
"Làm chủ AI — Dẫn đầu tương lai"
Hotline/Zalo: 0977.138.673

#TPAI #TuanPhamAI #HocVienAI #AIForBusiness #LamChuAI #NghiDinh30`;
}

// Helper đọc/ghi bảng tpai_settings trên Supabase
async function getSupabaseSetting(key, fallbackValue) {
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

// Gửi thông báo xem trước / xuất bản qua Bot Telegram @tpai_sales_alert_bot
async function sendTelegramNotification(item, mode = 'preview') {
  const isPublish = mode === 'publish';
  const scheduleTimeStr = item.scheduled_at
    ? new Date(item.scheduled_at).toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh', hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit', year: 'numeric' })
    : `${item.scheduled_slot || '06:30'} Hôm nay`;

  const headerBadge = isPublish
    ? `🚀 <b>[ĐÃ XUẤT BẢN TỰ ĐỘNG - TPAI AI COMMANDER]</b>`
    : `🔔 <b>[BẢN XEM TRƯỚC CHỜ DUYỆT - KHUNG GIỜ ${item.scheduled_slot || '06:30'}]</b>`;

  const msgText = `${headerBadge}
━━━━━━━━━━━━━━━━━━━━
📌 <b>Chủ đề:</b> <b>${item.topic_title}</b>
⏰ <b>Lịch hẹn:</b> <code>${scheduleTimeStr}</code>
🎬 <b>Định dạng:</b> <code>${item.media_type === 'video_reels' ? 'Video Reels 9:16 (MP4)' : 'Ảnh Thiết Kế Card (PNG)'}</code>
📡 <b>Kênh đích:</b> <code>${(item.target_channels || ['telegram', 'facebook']).join(', ').toUpperCase()}</code>
🤖 <b>Dây chuyền Agent:</b> <i>${(item.agents_chain || ['Coach Agent', 'Post Content Agent']).join(' → ')}</i>
━━━━━━━━━━━━━━━━━━━━
📝 <b>NỘI DUNG BÀI ĐĂNG:</b>

${item.content_text.slice(0, 950)}${item.content_text.length > 950 ? '...' : ''}
━━━━━━━━━━━━━━━━━━━━
👉 <a href="https://tpai-sales-crm.vercel.app/crm">Mở Trung Tâm Chỉ Huy AI Trên Mini CRM</a>`;

  const response = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: TELEGRAM_CHAT_ID,
      text: msgText,
      parse_mode: 'HTML',
      disable_web_page_preview: false
    })
  });

  return response.ok;
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'content-type');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');

  if (req.method === 'OPTIONS') {
    return res.status(200).json({});
  }

  try {
    // 1. GET: Lấy trạng thái 13 AI Agents, cấu hình khung giờ (06:30 & 18:30) và Hàng đợi nội dung
    if (req.method === 'GET') {
      let config = await getSupabaseSetting('orchestrator_config', null);
      if (!config) {
        config = DEFAULT_ORCHESTRATOR_CONFIG;
        await saveSupabaseSetting('orchestrator_config', config);
      }

      let queueData = await getSupabaseSetting('content_queue', null);
      if (!queueData || !Array.isArray(queueData.items) || queueData.items.length === 0) {
        queueData = { items: buildInitialQueue() };
        await saveSupabaseSetting('content_queue', queueData);
      }

      return res.status(200).json({
        success: true,
        config,
        queue: queueData.items,
        agents: TPAI_AGENTS_ROSTER,
        suggestedTopics: SUGGESTED_TOPICS
      });
    }

    // 2. POST: Điều khiển Coach Agent & Quản lý Hàng đợi
    if (req.method === 'POST') {
      const body = req.body || {};
      const { action } = body;

      let config = await getSupabaseSetting('orchestrator_config', DEFAULT_ORCHESTRATOR_CONFIG);
      let queueData = await getSupabaseSetting('content_queue', { items: buildInitialQueue() });
      let items = Array.isArray(queueData.items) ? queueData.items : buildInitialQueue();

      // Action 2.1: Lưu cấu hình lịch đăng (06:30 & 18:30, kênh đăng, chế độ duyệt)
      if (action === 'save_config') {
        config = {
          ...config,
          frequency: Number(body.frequency || 2),
          schedule_hours: Array.isArray(body.schedule_hours) ? body.schedule_hours : ['06:30', '18:30'],
          channels: Array.isArray(body.channels) ? body.channels : config.channels,
          topic_mode: body.topic_mode || config.topic_mode,
          approval_mode: body.approval_mode || config.approval_mode,
          fb_page_id: body.fb_page_id !== undefined ? body.fb_page_id : config.fb_page_id,
          fb_page_token: body.fb_page_token !== undefined ? body.fb_page_token : config.fb_page_token,
          fb_webhook_url: body.fb_webhook_url !== undefined ? body.fb_webhook_url : (config.fb_webhook_url || ''),
          updated_at: new Date().toISOString()
        };
        await saveSupabaseSetting('orchestrator_config', config);
        return res.status(200).json({
          success: true,
          message: 'Đã lưu cấu hình Trung tâm Chỉ huy AI!',
          config
        });
      }

      // Action 2.2: Kích hoạt Coach Agent tạo bài mới (Hỗ trợ cả Chế độ 1 Auto-Pilot & Chế độ 2 Co-Pilot)
      if (action === 'trigger_commander') {
        const mode = body.mode || 'auto_pilot'; // 'auto_pilot', 'suggested', 'custom'
        const hours = config.schedule_hours || ['06:30', '18:30'];
        const targetChannels = body.channels || config.channels || ['telegram', 'facebook', 'zalo'];

        const newItems = [];

        if (mode === 'custom' && body.custom_topic) {
          const customTitle = String(body.custom_topic).trim();
          const chosenSlot = body.scheduled_slot || hours[0] || '06:30';
          const chosenMedia = body.media_type || 'image_card';
          const nextSlotIso = getNextScheduleSlots(1, [chosenSlot])[0];
          const contentText = await generatePostWithAgents({
            title: customTitle,
            angle: 'Ý tưởng chỉ đạo trực tiếp từ Thầy Tuấn',
            mediaType: chosenMedia
          });

          const createdItem = {
            id: `queue-${Date.now()}`,
            topic_title: customTitle,
            angle: 'Chỉ đạo trực tiếp (Co-Pilot)',
            content_text: contentText,
            media_type: chosenMedia,
            media_url: chosenMedia === 'video_reels' ? '/assets/content/reels-50prompt.mp4' : '/assets/content/card-nd30.png',
            thumbnail_url: chosenMedia === 'video_reels' ? '/assets/content/card-reels-50prompt.png' : '/assets/content/card-nd30.png',
            target_channels: targetChannels,
            scheduled_slot: chosenSlot,
            scheduled_at: nextSlotIso,
            status: 'approved',
            agents_chain: ['Coach Agent', 'Offer Agent', 'Post Content Agent', 'Brand Agent', 'Sale DM Agent'],
            created_at: new Date().toISOString()
          };
          newItems.push(createdItem);
        } else if (mode === 'suggested' && body.topic_id) {
          const found = SUGGESTED_TOPICS.find(t => t.id === body.topic_id) || SUGGESTED_TOPICS[0];
          const chosenSlot = body.scheduled_slot || hours[0] || '06:30';
          const nextSlotIso = getNextScheduleSlots(1, [chosenSlot])[0];
          const contentText = await generatePostWithAgents({
            title: found.title,
            angle: found.angle,
            mediaType: found.media_type
          });

          const createdItem = {
            id: `queue-${Date.now()}`,
            topic_title: found.title,
            angle: found.angle,
            content_text: contentText,
            media_type: found.media_type,
            media_url: found.media_url,
            thumbnail_url: found.thumbnail_url || found.media_url,
            target_channels: targetChannels,
            scheduled_slot: chosenSlot,
            scheduled_at: nextSlotIso,
            status: 'approved',
            agents_chain: ['Coach Agent', 'Analysis Agent', 'Post Content Agent', 'TPAI Reels Agent', 'Brand Agent'],
            created_at: new Date().toISOString()
          };
          newItems.push(createdItem);
        } else {
          // Chế độ 1: AI Auto-Pilot — Tự động lên lịch 2 khung giờ 06:30 sáng và 18:30 chiều
          const batchCount = Number(body.batch_count || 2);
          const slots = getNextScheduleSlots(batchCount, hours);

          for (let i = 0; i < batchCount; i++) {
            const templateTopic = SUGGESTED_TOPICS[i % SUGGESTED_TOPICS.length];
            const slotHm = hours[i % hours.length] || (i % 2 === 0 ? '06:30' : '18:30');
            const contentText = await generatePostWithAgents({
              title: templateTopic.title,
              angle: templateTopic.angle,
              mediaType: templateTopic.media_type
            });

            newItems.push({
              id: `queue-${Date.now()}-${i}`,
              topic_title: templateTopic.title,
              angle: templateTopic.angle,
              content_text: contentText,
              media_type: templateTopic.media_type,
              media_url: templateTopic.media_url,
              thumbnail_url: templateTopic.thumbnail_url || templateTopic.media_url,
              target_channels: targetChannels,
              scheduled_slot: slotHm,
              scheduled_at: slots[i],
              status: 'approved',
              agents_chain: ['Coach Agent', 'Analysis Agent', 'Offer Agent', 'Post Content Agent', 'TPAI Reels Agent', 'Brand Agent'],
              created_at: new Date().toISOString()
            });
          }
        }

        items = [...newItems, ...items];
        await saveSupabaseSetting('content_queue', { items });

        return res.status(200).json({
          success: true,
          message: `Coach Agent đã điều phối 12 Agent khởi tạo thành công ${newItems.length} bài viết mới vào lịch 06:30 & 18:30!`,
          newItems,
          queue: items
        });
      }

      // Action 2.3: Bắn bản xem trước về Telegram của Thầy Tuấn hoặc Xuất bản ngay
      if (action === 'publish_or_preview') {
        const { item_id, mode = 'preview' } = body;
        const targetItem = items.find(i => i.id === item_id);
        if (!targetItem) {
          return res.status(404).json({ success: false, error: 'Không tìm thấy bài viết trong hàng đợi.' });
        }

        const teleOk = await sendTelegramNotification(targetItem, mode);

        // Nếu xuất bản lên Facebook Fanpage qua Webhook (Make.com / Pabbly — Khuyên Dùng 100% Free)
        let fbWebhookResult = null;
        if (mode === 'publish' && config.fb_webhook_url) {
          try {
            const baseAppUrl = 'https://tpai-sales-crm.vercel.app';
            const mediaFullUrl = targetItem.media_url?.startsWith('http')
              ? targetItem.media_url
              : `${baseAppUrl}${targetItem.media_url || '/assets/content/card-nd30.png'}`;

            const fbWebRes = await fetch(config.fb_webhook_url, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                action: 'publish_post',
                title: targetItem.topic_title,
                message: targetItem.content_text,
                content: targetItem.content_text,
                image_url: mediaFullUrl,
                media_url: mediaFullUrl,
                media_type: targetItem.media_type,
                page_id: config.fb_page_id || '809750085555882',
                scheduled_slot: targetItem.scheduled_slot,
                timestamp: new Date().toISOString()
              })
            });
            fbWebhookResult = { ok: fbWebRes.ok, status: fbWebRes.status };
          } catch (webErr) {
            console.warn('[FB Webhook Publish Warning]', webErr.message);
            fbWebhookResult = { ok: false, error: webErr.message };
          }
        }

        // Nếu xuất bản lên Facebook Fanpage qua Meta Graph API (khi Thầy đã điền Page Token)
        let fbResult = null;
        if (mode === 'publish' && config.fb_page_id && config.fb_page_token) {
          try {
            const fbRes = await fetch(`https://graph.facebook.com/v19.0/${config.fb_page_id}/feed`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                message: targetItem.content_text,
                access_token: config.fb_page_token
              })
            });
            fbResult = await fbRes.json();
          } catch (fbErr) {
            console.warn('[FB Graph Publish Warning]', fbErr.message);
          }
        }

        if (mode === 'publish') {
          targetItem.status = 'published';
          targetItem.published_at = new Date().toISOString();
          await saveSupabaseSetting('content_queue', { items });
        }

        return res.status(200).json({
          success: true,
          telegram_sent: teleOk,
          fb_result: fbResult,
          message: mode === 'publish'
            ? 'Đã xuất bản bài viết lên Kênh Telegram TPAI & cập nhật trạng thái Đã Đăng!'
            : 'Đã gửi bản xem trước kèm ảnh/video về Telegram @tpai_sales_alert_bot của Thầy Tuấn!',
          item: targetItem,
          queue: items
        });
      }

      // Action 2.4: Cập nhật nội dung hoặc đổi khung giờ (06:30 / 18:30) của 1 bài trong hàng đợi
      if (action === 'update_item') {
        const { item_id, topic_title, content_text, scheduled_slot, status } = body;
        const idx = items.findIndex(i => i.id === item_id);
        if (idx === -1) {
          return res.status(404).json({ success: false, error: 'Không tìm thấy bài viết.' });
        }

        if (topic_title !== undefined) items[idx].topic_title = topic_title;
        if (content_text !== undefined) items[idx].content_text = content_text;
        if (scheduled_slot !== undefined) items[idx].scheduled_slot = scheduled_slot;
        if (status !== undefined) items[idx].status = status;
        items[idx].updated_at = new Date().toISOString();

        await saveSupabaseSetting('content_queue', { items });
        return res.status(200).json({
          success: true,
          message: 'Đã cập nhật bài viết thành công!',
          item: items[idx],
          queue: items
        });
      }

      // Action 2.5: Xóa bài khỏi hàng đợi
      if (action === 'delete_item') {
        const { item_id } = body;
        items = items.filter(i => i.id !== item_id);
        await saveSupabaseSetting('content_queue', { items });
        return res.status(200).json({
          success: true,
          message: 'Đã xóa bài viết khỏi hàng đợi.',
          queue: items
        });
      }

      return res.status(400).json({ success: false, error: `Action không hợp lệ: ${action}` });
    }

    return res.status(405).json({ success: false, error: 'Method not allowed' });
  } catch (err) {
    console.error('[Orchestrator API Error]', err);
    return res.status(500).json({ success: false, error: err.message });
  }
}
