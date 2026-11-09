// Practice content for the Messages app. All people and organizations are fictional.
// The practice phone's "now" is Monday, November 9, 9:41 AM.
// Task: share the Thanksgiving luncheon picture with a friend. There are several friends on
// purpose (Margaret, Dorothy, Frank, plus Helen and George with no chat yet), so the person chooses.

export type ChatMessage = {
  id: string;
  fromMe: boolean;
  text?: string;
  photoIds?: string[];
  /** Small grey time shown above this message, like "Yesterday 4:12 PM". */
  stamp?: string;
};

export type Thread = {
  id: string;
  name: string;
  initials: string;
  isGroup?: boolean;
  /** Time shown in the conversation list. */
  time: string;
  unread: boolean;
  /** Sort order in the list: higher is more recent. */
  order: number;
  /** The other person is typing a reply. */
  typing?: boolean;
  messages: ChatMessage[];
};

export const INITIAL_THREADS: Thread[] = [
  {
    id: "linda",
    name: "Linda",
    initials: "L",
    time: "9:15 AM",
    unread: true,
    order: 100,
    messages: [
      { id: "l1", fromMe: false, stamp: "Saturday 6:02 PM", text: "Hi Mom! How was your week?" },
      { id: "l2", fromMe: true, text: "Very good. I went to the garden club." },
      { id: "l3", fromMe: false, stamp: "Today 9:15 AM", text: "That sounds lovely! Call me when you get a chance 😊" },
    ],
  },
  {
    id: "margaret",
    name: "Margaret Wilson",
    initials: "MW",
    time: "Yesterday",
    unread: false,
    order: 90,
    messages: [
      { id: "mw1", fromMe: false, stamp: "Yesterday 12:40 PM", text: "It was so good to see you at church this morning!" },
      { id: "mw2", fromMe: false, text: "Let's get coffee soon ☕" },
      { id: "mw3", fromMe: true, text: "I'd love that. How about next week?" },
      { id: "mw4", fromMe: false, text: "Perfect, I'll call you." },
    ],
  },
  {
    id: "bookclub",
    name: "Book Club",
    initials: "BC",
    isGroup: true,
    time: "Saturday",
    unread: false,
    order: 80,
    messages: [
      { id: "b1", fromMe: false, stamp: "Saturday 10:05 AM", text: "Don't forget, we meet Thursday at 4!" },
      { id: "b2", fromMe: false, text: "I'll bring lemon bars 🍋" },
    ],
  },
  {
    id: "drpatel",
    name: "Dr. Patel's Office",
    initials: "DP",
    time: "Friday",
    unread: false,
    order: 70,
    messages: [
      {
        id: "d1",
        fromMe: false,
        stamp: "Friday 2:30 PM",
        text: "Reminder: you have an appointment with Dr. Patel on Thursday, Nov 12 at 10:30 AM. Call (555) 014-7788 to reschedule.",
      },
    ],
  },
  {
    id: "dorothy",
    name: "Dorothy Hayes",
    initials: "DH",
    time: "Wednesday",
    unread: false,
    order: 60,
    messages: [
      { id: "dh1", fromMe: true, stamp: "Tuesday 7:18 PM", text: "Here's the soup recipe I told you about." },
      { id: "dh2", fromMe: false, stamp: "Wednesday 8:51 AM", text: "Thank you! I made it last night and it was delicious." },
    ],
  },
  {
    id: "tom",
    name: "Tom Russo",
    initials: "TR",
    time: "11/2/26",
    unread: false,
    order: 50,
    messages: [
      { id: "t1", fromMe: false, stamp: "Mon, Nov 2 at 5:20 PM", text: "Thanks for watering my plants last week!" },
      { id: "t2", fromMe: true, text: "Any time, Tom." },
    ],
  },
  {
    id: "frank",
    name: "Frank Miller",
    initials: "FM",
    time: "10/28/26",
    unread: false,
    order: 40,
    messages: [
      { id: "f1", fromMe: false, stamp: "Wed, Oct 28 at 9:03 AM", text: "Happy birthday! Hope you have a wonderful day 🎂" },
      { id: "f2", fromMe: true, text: "Thank you, Frank! That's so kind." },
    ],
  },
  // Contacts with no conversation yet: they only show up when starting a new message.
  { id: "helen", name: "Helen Brooks", initials: "HB", time: "", unread: false, order: 0, messages: [] },
  { id: "george", name: "George Kim", initials: "GK", time: "", unread: false, order: 0, messages: [] },
];

/** What the other person writes back after receiving photos. */
export function replyToPhotos(threadId: string, photoTitles: string[]): string {
  const thanksgiving = photoTitles.some((t) => /thanksgiving/i.test(t));
  if (threadId === "drpatel") return "This number does not receive messages. Please call the office at (555) 014-7788.";
  if (thanksgiving) return "What a beautiful picture! It looks like a wonderful luncheon 🦃 Thank you for sharing!";
  return "Oh, I love it! Thank you for sending ❤️";
}
