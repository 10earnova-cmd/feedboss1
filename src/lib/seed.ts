import type { Ad, Category, Performer, SiteSettings, Tag, Video } from '../types'

const samples = [
  'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
  'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4',
  'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
  'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4',
  'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerFun.mp4',
  'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerJoyrides.mp4',
  'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/Sintel.mp4',
  'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/TearsOfSteel.mp4',
]

function id(prefix: string, n: number) {
  return `${prefix}_${n}`
}

export const defaultSettings: SiteSettings = {
  siteNameEn: 'DeshiX',
  siteNameBn: 'দেশিএক্স',
  taglineEn: "Bangladesh's #1 adult video tube — 18+ only",
  taglineBn: 'বাংলাদেশের #১ অ্যাডাল্ট ভিডিও টিউব — শুধুমাত্র ১৮+',
  logoUrl: '',
  contactEmail: 'admin@deshix.com',
  telegram: '',
  ageGateEn:
    'This website contains adult sexual content. You must be 18 years or older to enter. By entering you confirm you are an adult and that viewing this material is legal in your location.',
  ageGateBn:
    'এই ওয়েবসাইটে প্রাপ্তবয়স্ক যৌন কনটেন্ট আছে। প্রবেশ করতে আপনার বয়স ১৮ বছর বা তার বেশি হতে হবে। প্রবেশ করে আপনি নিশ্চিত করছেন যে আপনি প্রাপ্তবয়স্ক এবং আপনার এলাকায় এই কনটেন্ট দেখা বৈধ।',
  termsEn:
    'DeshiX is an adult entertainment platform. All persons appearing are 18+. You may not upload illegal content, CSAM, non-consensual material, or copyrighted files you do not own. We may remove any video at any time.',
  termsBn:
    'DeshiX একটি অ্যাডাল্ট এন্টারটেইনমেন্ট প্ল্যাটফর্ম। সকল ব্যক্তি ১৮+। অবৈধ কনটেন্ট, নাবালক সংক্রান্ত কিছু, অসম্মতিমূলক ভিডিও বা কপিরাইট লঙ্ঘন আপলোড করা যাবে না। যেকোনো ভিডিও আমরা মুছে দিতে পারি।',
  privacyEn:
    'We store basic analytics (views) and account data for admins. Ads (Monetag) may set cookies. Do not share passwords. Contact us to request data deletion.',
  privacyBn:
    'আমরা ভিউ কাউন্ট ও অ্যাডমিন অ্যাকাউন্ট ডেটা রাখি। বিজ্ঞাপন (Monetag) কুকি ব্যবহার করতে পারে। পাসওয়ার্ড শেয়ার করবেন না। ডেটা মুছতে আমাদের সাথে যোগাযোগ করুন।',
  dmcaEn:
    'If you believe your copyright is infringed, email the admin with the video URL, your contact, and proof of ownership. We will review and remove valid claims.',
  dmcaBn:
    'কপিরাইট লঙ্ঘন মনে হলে ভিডিওর লিংক, আপনার যোগাযোগ ও মালিকানার প্রমাণসহ অ্যাডমিনকে ইমেইল করুন। বৈধ দাবি রিভিউ করে ভিডিও সরানো হবে।',
  statement2257En:
    '18 U.S.C. 2257 record-keeping: All models appearing on this site were 18 years of age or older at the time of depiction. Custodian of records: Site Administrator, contact email in settings.',
  statement2257Bn:
    '১৮ U.S.C. ২২৫৭: এই সাইটের সকল মডেলের চিত্রায়ণের সময় বয়স ১৮ বা তার বেশি ছিল। রেকর্ড কিপার: সাইট অ্যাডমিন, সেটিংসের ইমেইল ব্যবহার করুন।',
  aboutEn:
    'DeshiX is a Bangladeshi adult video tube. Watch deshi, bangla and homemade clips. Content is managed from the /admin panel.',
  aboutBn:
    'DeshiX বাংলাদেশি অ্যাডাল্ট ভিডিও টিউব। দেশী, বাংলা ও হোমমেড ক্লিপ দেখুন। সব কনটেন্ট /admin প্যানেল থেকে ম্যানেজ হয়।',
  r2PublicBase: import.meta.env.VITE_R2_PUBLIC_BASE || '',
  workerUrl: import.meta.env.VITE_R2_WORKER_URL || '/api',
  uploadSecret: import.meta.env.VITE_R2_UPLOAD_SECRET || '',
  monetagSiteId: '',
}

export const defaultCategories: Category[] = [
  { id: id('cat', 1), slug: 'deshi', nameEn: 'Deshi', nameBn: 'দেশী', descriptionEn: 'Bangladeshi clips', descriptionBn: 'বাংলাদেশি ক্লিপ', thumbnailUrl: '', order: 1 },
  { id: id('cat', 2), slug: 'bangla', nameEn: 'Bangla', nameBn: 'বাংলা', descriptionEn: 'Bangla language videos', descriptionBn: 'বাংলা ভাষার ভিডিও', thumbnailUrl: '', order: 2 },
  { id: id('cat', 3), slug: 'homemade', nameEn: 'Homemade', nameBn: 'হোমমেড', descriptionEn: 'Amateur homemade', descriptionBn: 'অ্যামেচার হোমমেড', thumbnailUrl: '', order: 3 },
  { id: id('cat', 4), slug: 'viral', nameEn: 'Viral', nameBn: 'ভাইরাল', descriptionEn: 'Viral leaks', descriptionBn: 'ভাইরাল লিক', thumbnailUrl: '', order: 4 },
  { id: id('cat', 5), slug: 'hotel', nameEn: 'Hotel', nameBn: 'হোটেল', descriptionEn: 'Hotel room videos', descriptionBn: 'হোটেল রুম ভিডিও', thumbnailUrl: '', order: 5 },
  { id: id('cat', 6), slug: 'married', nameEn: 'Married', nameBn: 'ম্যারেড', descriptionEn: 'Married couples', descriptionBn: 'বিবাহিত জুটি', thumbnailUrl: '', order: 6 },
  { id: id('cat', 7), slug: 'indian', nameEn: 'Indian', nameBn: 'ইন্ডিয়ান', descriptionEn: 'Indian clips', descriptionBn: 'ইন্ডিয়ান ক্লিপ', thumbnailUrl: '', order: 7 },
  { id: id('cat', 8), slug: 'mms', nameEn: 'MMS', nameBn: 'এমএমএস', descriptionEn: 'MMS style clips', descriptionBn: 'এমএমএস স্টাইল ক্লিপ', thumbnailUrl: '', order: 8 },
]

export const defaultTags: Tag[] = [
  { id: id('tag', 1), slug: 'dhaka', nameEn: 'Dhaka', nameBn: 'ঢাকা' },
  { id: id('tag', 2), slug: 'chittagong', nameEn: 'Chittagong', nameBn: 'চট্টগ্রাম' },
  { id: id('tag', 3), slug: 'leaked', nameEn: 'Leaked', nameBn: 'লিকেড' },
  { id: id('tag', 4), slug: 'amateur', nameEn: 'Amateur', nameBn: 'অ্যামেচার' },
  { id: id('tag', 5), slug: 'couple', nameEn: 'Couple', nameBn: 'কাপল' },
  { id: id('tag', 6), slug: 'hd', nameEn: 'HD', nameBn: 'এইচডি' },
]

export const defaultPerformers: Performer[] = [
  { id: id('m', 1), slug: 'ria', name: 'Ria', bioEn: 'Featured deshi model.', bioBn: 'ফিচার্ড দেশী মডেল।', avatarUrl: '' },
  { id: id('m', 2), slug: 'nisha', name: 'Nisha', bioEn: 'Popular amateur creator.', bioBn: 'জনপ্রিয় অ্যামেচার ক্রিয়েটর।', avatarUrl: '' },
]

const titles = [
  { bn: 'ঢাকার হোটেলে দেশী জুটি', en: 'Deshi couple in a Dhaka hotel', cat: 5, tags: [1, 5, 6], feat: true, trend: true },
  { bn: 'বাংলা হোমমেড লিকেড ক্লিপ', en: 'Bangla homemade leaked clip', cat: 3, tags: [3, 4], feat: true, trend: false },
  { bn: 'চট্টগ্রামের ভাইরাল এমএমএস', en: 'Viral Chittagong MMS', cat: 4, tags: [2, 3], feat: false, trend: true },
  { bn: 'দেশী অ্যামেচার নাইট ভিডিও', en: 'Deshi amateur night video', cat: 1, tags: [4, 6], feat: true, trend: true },
  { bn: 'ম্যারেড কাপল রুম রেকর্ড', en: 'Married couple room recording', cat: 6, tags: [5], feat: false, trend: false },
  { bn: 'বাংলা ফুল ক্যাপশন সহ', en: 'Bangla video with full caption', cat: 2, tags: [6], feat: false, trend: true },
  { bn: 'ইন্ডিয়ান হোটেল হিট ক্লিপ', en: 'Indian hotel hit clip', cat: 7, tags: [6], feat: false, trend: false },
  { bn: 'হোমমেড সেলফি ক্যামেরা', en: 'Homemade selfie camera', cat: 3, tags: [4], feat: true, trend: false },
  { bn: 'ঢাকার লিকেড প্রাইভেট ফাইল', en: 'Dhaka leaked private file', cat: 8, tags: [1, 3], feat: false, trend: true },
  { bn: 'দেশী ভাইরাল ট্রেন্ডিং', en: 'Deshi viral trending', cat: 1, tags: [3, 6], feat: true, trend: true },
  { bn: 'বাংলা কাপল আউটডোর নেই — রুম', en: 'Bangla couple indoor room', cat: 2, tags: [5], feat: false, trend: false },
  { bn: 'হোটেল নাইট ফুল ভিডিও', en: 'Hotel night full video', cat: 5, tags: [6], feat: false, trend: true },
]

export function defaultVideos(): Video[] {
  const now = Date.now()
  return titles.map((t, i) => ({
    id: id('vid', i + 1),
    slug: t.en.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''),
    titleEn: t.en,
    titleBn: t.bn,
    captionEn: `${t.en}. Sample placeholder video for layout. Replace from /admin after connecting Cloudflare R2.`,
    captionBn: `${t.bn}। ডেমো প্লেসহোল্ডার ভিডিও। Cloudflare R2 কানেক্ট করে /admin থেকে আসল ফাইল আপলোড করুন।`,
    videoUrl: samples[i % samples.length],
    thumbnailUrl: `https://picsum.photos/seed/deshix${i + 11}/800/450`,
    duration: 90 + i * 37,
    views: 1200 + i * 1840,
    likes: 40 + i * 13,
    categoryId: id('cat', t.cat),
    tagIds: t.tags.map((n) => id('tag', n)),
    modelIds: i % 2 === 0 ? [id('m', 1)] : [id('m', 2)],
    status: 'published',
    featured: t.feat,
    trending: t.trend,
    createdAt: now - i * 86400000,
    updatedAt: now - i * 86400000,
  }))
}

export function defaultAds(): Ad[] {
  return [
    { id: 'ad_pop', slot: 'popunder', name: 'Monetag Popunder', type: 'script', scriptCode: '', html: '', url: '', labelEn: '', labelBn: '', enabled: false },
    { id: 'ad_header', slot: 'header', name: 'Header banner', type: 'html', scriptCode: '', html: '', url: '', labelEn: 'Sponsored', labelBn: 'স্পনসর্ড', enabled: false },
    { id: 'ad_player', slot: 'below_player', name: 'Below player', type: 'html', scriptCode: '', html: '', url: '', labelEn: '', labelBn: '', enabled: false },
    { id: 'ad_side', slot: 'sidebar', name: 'Sidebar', type: 'html', scriptCode: '', html: '', url: '', labelEn: '', labelBn: '', enabled: false },
    { id: 'ad_grid', slot: 'in_grid', name: 'In video grid', type: 'html', scriptCode: '', html: '', url: '', labelEn: 'Ad', labelBn: 'অ্যাড', enabled: false },
    { id: 'ad_foot', slot: 'footer', name: 'Footer', type: 'html', scriptCode: '', html: '', url: '', labelEn: '', labelBn: '', enabled: false },
    { id: 'ad_sticky', slot: 'mobile_sticky', name: 'Mobile sticky bar', type: 'direct_link', scriptCode: '', html: '', url: 'https://otieu.com/4/YOUR_ZONE_ID', labelEn: 'Watch Full HD', labelBn: 'ফুল HD দেখুন', enabled: false },
    { id: 'ad_cta', slot: 'watch_cta', name: 'Watch page CTA (Monetag direct)', type: 'direct_link', scriptCode: '', html: '', url: 'https://otieu.com/4/YOUR_ZONE_ID', labelEn: 'Continue to Full Video', labelBn: 'ফুল ভিডিও চালু করুন', enabled: false },
    { id: 'ad_dl', slot: 'download_cta', name: 'Download button (Monetag direct)', type: 'direct_link', scriptCode: '', html: '', url: 'https://otieu.com/4/YOUR_ZONE_ID', labelEn: 'Download HD', labelBn: 'HD ডাউনলোড', enabled: false },
  ]
}
