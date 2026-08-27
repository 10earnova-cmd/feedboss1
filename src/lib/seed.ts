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
  siteNameEn: 'FeedBoss',
  siteNameBn: 'FeedBoss',
  taglineEn: "Bangladesh's #1 adult video tube — 18+ only",
  taglineBn: 'বাংলাদেশের #১ অ্যাডাল্ট ভিডিও টিউব — শুধুমাত্র ১৮+',
  logoUrl: '',
  contactEmail: 'admin@deshix.com',
  telegram: '',
  ageGateEn:
    'This website contains adult sexual content. You must be 18 years or older to enter. By entering you confirm you are an adult and that viewing this material is legal in your location.',
  ageGateBn:
    'এই ওয়েবসাইটে প্রাপ্তবয়স্ক যৌন কনটেন্ট আছে। প্রবেশ করতে আপনার বয়স ১৮ বছর বা তার বেশি হতে হবে। প্রবেশ করে আপনি নিশ্চিত করছেন যে আপনি প্রাপ্তবয়স্ক এবং আপনার এলাকায় এই কনটেন্ট দেখা বৈধ।',
  termsEn: `TERMS OF SERVICE

This website is operated from the United States. It is a US-based service.

This site does not create, produce, leak, or originally distribute viral videos. We do not debut, premiere, or first-publish leaked or exclusive clips. We only host and republish open-source / publicly available videos that already exist on the internet.

We are not a leak network. We do not claim ownership of third-party public content. Videos on this site are copies or mirrors of material that was already publicly available online.

All persons depicted must have been 18 years of age or older at the time of depiction. Illegal content, child sexual abuse material, and non-consensual material are strictly forbidden.

We may remove any video at any time. If you believe content should not appear here, contact the site administrator.`,
  termsBn: `সেবার শর্তাবলী

এই ওয়েবসাইট যুক্তরাষ্ট্র থেকে পরিচালিত হয়। এটি একটি US-based সাইট।

এই সাইট কোনো ভাইরাল ভিডিও তৈরি, প্রোডিউস, লিক বা অরিজিনালি ডিস্ট্রিবিউট করে না। আমরা কোনো এক্সক্লুসিভ বা লিকেড ক্লিপ প্রথমবার প্রকাশ করি না। আমরা শুধু সেই ওপেন-সোর্স / পাবলিক ভিডিও হোস্ট করি যা আগে থেকেই ইন্টারনেটে মজুদ আছে।

এটি লিক নেটওয়ার্ক নয়। থার্ড-পার্টি পাবলিক কনটেন্টের মালিকানা আমরা দাবি করি না।

চিত্রায়ণের সময় সকল ব্যক্তির বয়স ১৮ বা তার বেশি হতে হবে। অবৈধ কনটেন্ট নিষিদ্ধ। যেকোনো ভিডিও আমরা মুছে দিতে পারি।`,
  privacyEn: `PRIVACY POLICY

This is a US-based website. We store limited technical data such as video view counts and administrator account details needed to operate the service.

We do not sell your personal information. Third-party advertising partners (including Monetag) may set cookies or similar technologies.

Do not share admin passwords. To request deletion of account data, contact the email listed in site settings.

Content on this site is limited to open-source videos already published on the internet. We do not collect or distribute original viral leaks.`,
  privacyBn: `প্রাইভেসি পলিসি

এটি একটি US-based ওয়েবসাইট। আমরা সীমিত টেকনিক্যাল ডেটা রাখি, যেমন ভিডিও ভিউ কাউন্ট ও অ্যাডমিন অ্যাকাউন্ট তথ্য।

আমরা আপনার ব্যক্তিগত তথ্য বিক্রি করি না। বিজ্ঞাপন পার্টনার (Monetag সহ) কুকি ব্যবহার করতে পারে।

অ্যাডমিন পাসওয়ার্ড শেয়ার করবেন না। অ্যাকাউন্ট ডেটা মুছতে সাইট সেটিংসের ইমেইলে যোগাযোগ করুন।

এই সাইটের কনটেন্ট শুধু সেই ওপেন-সোর্স ভিডিও, যা আগে থেকেই ইন্টারনেটে প্রকাশিত। আমরা অরিজিনাল ভাইরাল লিক সংগ্রহ বা ডিস্ট্রিবিউট করি না।`,
  dmcaEn: `DMCA NOTICE

This is a US-based website. We host only open-source / already-public internet videos. We do not originally distribute viral or exclusive leaks.

If you are a copyright owner and believe material on this site infringes your rights, email the administrator with: (1) the video URL, (2) your contact information, and (3) proof of ownership. We will review valid claims and remove infringing files.

Counter-notices may be sent to the same contact.`,
  dmcaBn: `DMCA নোটিশ

এটি US-based সাইট। আমরা শুধু ওপেন-সোর্স / আগে থেকে পাবলিক ইন্টারনেট ভিডিও হোস্ট করি। ভাইরাল বা এক্সক্লুসিভ লিক অরিজিনালি ডিস্ট্রিবিউট করি না।

কপিরাইট মালিক হলে ভিডিওর URL, যোগাযোগ ও মালিকানার প্রমাণসহ অ্যাডমিনকে ইমেইল করুন। বৈধ দাবি রিভিউ করে ফাইল সরানো হবে।`,
  statement2257En: `18 U.S.C. 2257 STATEMENT

This website is operated from the United States. All models appearing in content on this site were 18 years of age or older at the time of depiction. This site republishes publicly available / open-source adult videos already on the internet; it does not produce original viral content.

Custodian of records: Site Administrator (contact email in settings).`,
  statement2257Bn: `১৮ U.S.C. ২২৫৭ বিবৃতি

এই ওয়েবসাইট যুক্তরাষ্ট্র থেকে পরিচালিত। এই সাইটের কনটেন্টে চিত্রায়ণের সময় সকল মডেলের বয়স ১৮ বা তার বেশি ছিল। সাইট শুধু ইন্টারনেটে আগে থেকে থাকা পাবলিক / ওপেন-সোর্স অ্যাডাল্ট ভিডিও পুনঃপ্রকাশ করে; অরিজিনাল ভাইরাল কনটেন্ট প্রোডিউস করে না।

রেকর্ড কিপার: সাইট অ্যাডমিন (সেটিংসের ইমেইল)।`,
  aboutEn: `This is a US-based adult video website.

We do not distribute original viral videos. We do not debut leaked or exclusive clips. We only publish open-source videos that already exist on the internet.

Content is managed from the /admin panel. 18+ only.`,
  aboutBn: `এটি একটি US-based অ্যাডাল্ট ভিডিও ওয়েবসাইট।

আমরা অরিজিনাল ভাইরাল ভিডিও ডিস্ট্রিবিউট করি না। লিকেড বা এক্সক্লুসিভ ক্লিপ প্রথমবার প্রকাশ করি না। আমরা শুধু সেই ওপেন-সোর্স ভিডিও দিই যা আগে থেকেই ইন্টারনেটে মজুদ আছে।

কনটেন্ট /admin প্যানেল থেকে ম্যানেজ হয়। শুধুমাত্র ১৮+।`,
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
    thumbnailUrl: '',
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

export function applyLegalCopy(s: SiteSettings): SiteSettings {
  if (s.termsEn.includes('US-based') && s.termsEn.includes('open-source')) return s
  return {
    ...s,
    termsEn: defaultSettings.termsEn,
    termsBn: defaultSettings.termsBn,
    privacyEn: defaultSettings.privacyEn,
    privacyBn: defaultSettings.privacyBn,
    dmcaEn: defaultSettings.dmcaEn,
    dmcaBn: defaultSettings.dmcaBn,
    statement2257En: defaultSettings.statement2257En,
    statement2257Bn: defaultSettings.statement2257Bn,
    aboutEn: defaultSettings.aboutEn,
    aboutBn: defaultSettings.aboutBn,
  }
}
