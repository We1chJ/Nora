// Practice content for the demo phone. All names and organizations are fictional.

export type EventItem = {
  id: string;
  slug: string;
  emoji: string;
  color: string;
  title: string;
  date: string;
  time: string;
  place: string;
  host: string;
  cost: string;
  capacity: number;
  spotsLeft: number;
  summary: string;
  details: string[];
};

// The practice phone's "today" is Monday, November 9.
export const EVENTS: EventItem[] = [
  {
    id: "yoga",
    slug: "chair-yoga",
    emoji: "🧘",
    color: "#e8f3ec",
    title: "Chair Yoga",
    date: "Tuesday, November 10",
    time: "10:00 – 11:00 AM",
    place: "Room 2",
    host: "Maria Lopez",
    cost: "Free",
    capacity: 15,
    spotsLeft: 6,
    summary: "Gentle stretches you can do sitting down.",
    details: [
      "Join Maria for a relaxing hour of gentle stretches and breathing. Every move can be done from a chair, so no experience is needed.",
      "Wear comfortable clothes and bring a water bottle. Cushions are provided.",
    ],
  },
  {
    id: "techcafe",
    slug: "tech-help-cafe",
    emoji: "☕",
    color: "#f6eee4",
    title: "Tech Help Café",
    date: "Wednesday, November 11",
    time: "2:00 – 4:00 PM",
    place: "Library Lounge",
    host: "Volunteers from Maple Grove College",
    cost: "Free",
    capacity: 20,
    spotsLeft: 11,
    summary: "Bring your phone or tablet and get friendly help.",
    details: [
      "Students from Maple Grove College will answer your questions about phones, tablets, email and video calls.",
      "Coffee and cookies will be served. Bring your device and its charger.",
    ],
  },
  {
    id: "watercolor",
    slug: "watercolor-for-beginners",
    emoji: "🎨",
    color: "#e9eefb",
    title: "Watercolor for Beginners",
    date: "Thursday, November 12",
    time: "1:00 – 3:00 PM",
    place: "Art Room",
    host: "Dennis Park",
    cost: "$5, paid at the door",
    capacity: 12,
    spotsLeft: 0,
    summary: "Paint a simple autumn landscape. All supplies included.",
    details: [
      "Learn the basics of watercolor painting and take home your own autumn landscape.",
      "Paper, paints and brushes are provided. Wear clothes you don't mind getting a little paint on.",
    ],
  },
  {
    id: "movie",
    slug: "classic-movie-afternoon",
    emoji: "🎬",
    color: "#f3e8f1",
    title: "Classic Movie Afternoon",
    date: "Friday, November 13",
    time: "3:00 – 5:15 PM",
    place: "Main Hall",
    host: "Community Center staff",
    cost: "Free",
    capacity: 60,
    spotsLeft: 24,
    summary: "A beloved musical from the 1950s on the big screen.",
    details: [
      "Settle in for a classic film on the big screen, with a short break in the middle.",
      "Popcorn and lemonade are free. Registering helps us set out enough chairs.",
    ],
  },
  {
    id: "garden",
    slug: "garden-club",
    emoji: "🌻",
    color: "#fbf3dc",
    title: "Garden Club: Planting Fall Bulbs",
    date: "Saturday, November 14",
    time: "9:00 – 10:30 AM",
    place: "Courtyard Garden",
    host: "Ruth Ellis",
    cost: "Free",
    capacity: 16,
    spotsLeft: 3,
    summary: "Plant tulips and daffodils for the spring.",
    details: [
      "This month we're planting tulip and daffodil bulbs in the courtyard beds.",
      "Gloves and tools are provided. Wear shoes that can get a little muddy.",
    ],
  },
  {
    id: "walk",
    slug: "morning-walking-group",
    emoji: "🚶",
    color: "#e6f2f7",
    title: "Morning Walking Group",
    date: "Monday, November 16",
    time: "8:30 – 9:30 AM",
    place: "Meet at the front entrance",
    host: "Tom Briggs",
    cost: "Free",
    capacity: 25,
    spotsLeft: 14,
    summary: "An easy-paced walk around Maple Grove Park.",
    details: [
      "A friendly, easy-paced walk of about one mile around Maple Grove Park, with benches to rest along the way.",
      "If it rains, we'll walk laps in the Main Hall instead.",
    ],
  },
  {
    id: "cooking",
    slug: "healthy-cooking-demo",
    emoji: "🥗",
    color: "#edf6e4",
    title: "Healthy Cooking Demo",
    date: "Wednesday, November 18",
    time: "11:00 AM – 12:30 PM",
    place: "Community Kitchen",
    host: "Chef Anita Rao",
    cost: "$3, paid at the door",
    capacity: 18,
    spotsLeft: 9,
    summary: "Simple, tasty soups for cold days, with samples.",
    details: [
      "Chef Anita shows three easy soups that are good for you and simple to make at home.",
      "You'll get to taste each one and take home the recipes.",
    ],
  },
  {
    id: "thanksgiving",
    slug: "thanksgiving-luncheon",
    emoji: "🦃",
    color: "#fbeadb",
    title: "Thanksgiving Luncheon",
    date: "Saturday, November 21",
    time: "12:00 – 2:00 PM",
    place: "Main Hall",
    host: "Maple Grove volunteers",
    cost: "Free",
    capacity: 80,
    spotsLeft: 22,
    summary: "A festive turkey lunch with all the trimmings.",
    details: [
      "Celebrate the season with neighbors over roast turkey, stuffing, mashed potatoes, cranberry sauce and pumpkin pie. A vegetarian plate is available.",
      "There will be live piano music and a raffle. Family and friends are welcome.",
    ],
  },
];

export type EmailKind = "personal" | "spam" | "ad";
export type Folder = "inbox" | "spam" | "trash";

export type Email = {
  id: string;
  from: string;
  address: string;
  subject: string;
  preview: string;
  body: string[];
  kind: EmailKind;
  cta?: string;
  folder: Folder;
  read: boolean;
};

export const INITIAL_EMAILS: Email[] = [
  {
    id: "m1",
    from: "Linda Chen",
    address: "linda.chen@mailbox.example",
    subject: "Photos from Sunday 🌷",
    preview: "Hi Mom! It was so nice to see you...",
    body: [
      "Hi Mom!",
      "It was so nice to see you on Sunday. The kids haven't stopped talking about your pie. I'll send you the photos in Messages later this week.",
      "Love, Linda",
    ],
    kind: "personal",
    folder: "inbox",
    read: false,
  },
  {
    id: "m2",
    from: "Prize Center",
    address: "winner@prize-center-claims.biz",
    subject: "🎉 CONGRATULATIONS! You WON a $1,000 Gift Card",
    preview: "You have been selected as our lucky winner...",
    body: [
      "Dear Valued Customer,",
      "You have been selected as our LUCKY WINNER of a $1,000 gift card! To receive your prize, confirm your bank details within 24 hours.",
      "Act now — this offer expires soon!",
    ],
    kind: "spam",
    cta: "CLAIM MY PRIZE",
    folder: "inbox",
    read: false,
  },
  {
    id: "m3",
    from: "ShopMart Deals",
    address: "deals@shopmart-mail.example",
    subject: "This Week Only: 40% Off Kitchen Essentials",
    preview: "Pots, pans, and more at our lowest prices...",
    body: [
      "Big savings are here!",
      "Get 40% off pots, pans, mixing bowls, and more. Prices this low won't last — shop the sale today.",
      "Free shipping on orders over $35.",
    ],
    kind: "ad",
    cta: "SHOP THE SALE",
    folder: "inbox",
    read: true,
  },
  {
    id: "m4",
    from: "Dr. Patel's Office",
    address: "appointments@patelfamilymed.example",
    subject: "Appointment reminder: Thursday 9:30 AM",
    preview: "This is a reminder of your upcoming visit...",
    body: [
      "Hello,",
      "This is a friendly reminder of your appointment with Dr. Patel on Thursday at 9:30 AM.",
      "Please arrive 10 minutes early and bring your insurance card. Call us if you need to reschedule.",
    ],
    kind: "personal",
    folder: "inbox",
    read: false,
  },
  {
    id: "m5",
    from: "Account Security Team",
    address: "security-alert@acc0unt-verify.net",
    subject: "URGENT: Your account will be suspended",
    preview: "We detected unusual activity. Verify now...",
    body: [
      "We detected unusual activity on your account.",
      "Your account will be SUSPENDED in 12 hours unless you verify your password and card number using the link below.",
      "Failure to act will result in permanent loss of access.",
    ],
    kind: "spam",
    cta: "VERIFY MY ACCOUNT",
    folder: "inbox",
    read: false,
  },
  {
    id: "m6",
    from: "Garden & Home Weekly",
    address: "news@gardenhomeweekly.example",
    subject: "New arrivals for fall planting 🍂",
    preview: "Bulbs, mums, and cozy outdoor decor...",
    body: [
      "Fall is here!",
      "Browse our new selection of tulip bulbs, mums, and cozy outdoor decor. Members save an extra 10% this weekend.",
    ],
    kind: "ad",
    cta: "BROWSE NEW ARRIVALS",
    folder: "inbox",
    read: true,
  },
  {
    id: "m7",
    from: "Maple Grove Library",
    address: "holds@maplegrovelibrary.example",
    subject: "Your book is ready for pickup",
    preview: "The book you reserved is waiting at the desk...",
    body: [
      "Good news!",
      "The book you reserved is waiting for you at the front desk. We'll hold it for 7 days.",
    ],
    kind: "personal",
    folder: "inbox",
    read: true,
  },
  {
    id: "m8",
    from: "Rx Discount Pharmacy",
    address: "offers@cheap-rx-now.biz",
    subject: "Cheap m3ds without prescription!!!",
    preview: "Save 90% on all medicines, no doctor needed...",
    body: [
      "SAVE 90% ON ALL MEDICINES!!!",
      "No prescription needed. Fast shipping from overseas. Pay with gift cards for extra savings.",
    ],
    kind: "spam",
    cta: "ORDER NOW",
    folder: "inbox",
    read: false,
  },
  {
    id: "m9",
    from: "TravelNow",
    address: "offers@travelnow-mail.example",
    subject: "Last-minute cruise deals just for you",
    preview: "Sail the Caribbean from $499 per person...",
    body: [
      "Your next adventure is waiting!",
      "Sail the Caribbean from just $499 per person. Limited cabins available at this price.",
    ],
    kind: "ad",
    cta: "SEE CRUISE DEALS",
    folder: "inbox",
    read: true,
  },
];

export type Photo = {
  id: string;
  emoji: string;
  bg: string;
  title: string;
  date: string;
};

// Duplicates share the same picture, title and date, like copies saved twice on a real phone.
export const INITIAL_PHOTOS: Photo[] = [
  { id: "p1", emoji: "🌅", bg: "#f6b27a", title: "Sunset at the lake", date: "June 2" },
  { id: "p2", emoji: "🌅", bg: "#f6b27a", title: "Sunset at the lake", date: "June 2" },
  { id: "p3", emoji: "🐶", bg: "#b9d98c", title: "Buddy in the yard", date: "June 5" },
  { id: "p4", emoji: "🎂", bg: "#f4a6c0", title: "Birthday cake", date: "June 12" },
  { id: "p5", emoji: "🌸", bg: "#d7c4f2", title: "Spring flowers", date: "June 20" },
  { id: "p6", emoji: "🎂", bg: "#f4a6c0", title: "Birthday cake", date: "June 12" },
  { id: "p7", emoji: "👨‍👩‍👧", bg: "#9fd3e6", title: "Family picnic", date: "July 4" },
  { id: "p8", emoji: "👨‍👩‍👧", bg: "#9fd3e6", title: "Family picnic", date: "July 4" },
  { id: "p9", emoji: "🏞️", bg: "#a8c7a0", title: "Mountain trail", date: "July 18" },
  { id: "p10", emoji: "👨‍👩‍👧", bg: "#9fd3e6", title: "Family picnic", date: "July 4" },
  { id: "p11", emoji: "🐱", bg: "#e8d3a9", title: "Whiskers napping", date: "August 9" },
  { id: "p12", emoji: "🥧", bg: "#e9c08f", title: "Apple pie", date: "August 30" },
];

export type ChatMessage = {
  id: string;
  fromMe: boolean;
  text?: string;
  photoIds?: string[];
};

export type Thread = {
  id: string;
  name: string;
  avatar: string;
  messages: ChatMessage[];
};

export const INITIAL_THREADS: Thread[] = [
  {
    id: "linda",
    name: "Linda (daughter)",
    avatar: "👩",
    messages: [
      { id: "l1", fromMe: false, text: "Hi Mom! How was your week?" },
      { id: "l2", fromMe: true, text: "Very good. I went to the garden club." },
      { id: "l3", fromMe: false, text: "That sounds lovely! Send me some pictures sometime 😊" },
    ],
  },
  {
    id: "bookclub",
    name: "Book Club Friends",
    avatar: "📚",
    messages: [
      { id: "b1", fromMe: false, text: "Don't forget, we meet Thursday at 4!" },
      { id: "b2", fromMe: false, text: "I'll bring lemon bars 🍋" },
    ],
  },
  {
    id: "tom",
    name: "Tom (neighbor)",
    avatar: "👨",
    messages: [
      { id: "t1", fromMe: false, text: "Thanks for watering my plants last week!" },
      { id: "t2", fromMe: true, text: "Any time, Tom." },
    ],
  },
];

export type Account = { firstName: string; lastName: string; email: string; password: string; phone: string };
export type Registration = { eventId: string; people: number; confirmation: string };
