// Photo library for the practice phone's Photos app. Images are free Unsplash photos in
// public/photos (credits in public/photos/CREDITS.txt). The phone's "today" is Monday, November 9.
//
// Dog task: ten photos of a friend's dog, Ruby, taken yesterday. Only dog-1 shows her looking at
// the camera; the other nine should be moved to the bin.

export type Photo = {
  id: string;
  src: string;
  thumb: string;
  title: string;
  /** Day heading in the grid, like "Today" or "Sat, Nov 7". */
  day: string;
  /** Shown in the photo viewer, like "Sunday, November 8 · 3:04 PM". */
  taken: string;
  /** Extra words the Search tab matches, like "dog" for Ruby. */
  tags: string;
  favorite?: boolean;
};

const TAGS: Record<string, string> = {
  Ruby: "dog dogs pet pets animal",
  "Thanksgiving luncheon": "turkey food dinner holiday",
  "Morning coffee": "coffee drink food",
  Roses: "flowers flower",
  Tulips: "flowers flower garden",
  "Apple pie": "food dessert",
  "Birthday cake": "food dessert",
  "Farmers market": "food fruit",
  Hummingbird: "bird animal",
  "Mountain lake": "nature water",
  "Sunset at the beach": "nature water",
  "Autumn at the park": "nature trees",
  "Snowy cabin": "nature snow winter",
};

const photo = (id: string, file: string, title: string, day: string, taken: string): Photo => ({
  id,
  src: `/photos/${file}.jpg`,
  thumb: `/photos/${file}-thumb.jpg`,
  title,
  day,
  taken,
  tags: TAGS[title] ?? "",
});

const YESTERDAY = "Sunday, November 8";

// Newest first, the order the grid shows them.
export const INITIAL_PHOTOS: Photo[] = [
  // The dog's photos, in the order they were taken. The keeper (dog-1) is in the middle.
  photo("dog-a", "dog-2", "Ruby", "Yesterday", `${YESTERDAY} · 3:02 PM`),
  photo("dog-b", "dog-9", "Ruby", "Yesterday", `${YESTERDAY} · 3:02 PM`),
  photo("dog-c", "dog-3", "Ruby", "Yesterday", `${YESTERDAY} · 3:03 PM`),
  photo("dog-d", "dog-7", "Ruby", "Yesterday", `${YESTERDAY} · 3:04 PM`),
  photo("dog-e", "dog-1", "Ruby", "Yesterday", `${YESTERDAY} · 3:04 PM`),
  photo("dog-f", "dog-4", "Ruby", "Yesterday", `${YESTERDAY} · 3:05 PM`),
  photo("dog-g", "dog-10", "Ruby", "Yesterday", `${YESTERDAY} · 3:06 PM`),
  photo("dog-h", "dog-6", "Ruby", "Yesterday", `${YESTERDAY} · 3:07 PM`),
  photo("dog-i", "dog-8", "Ruby", "Yesterday", `${YESTERDAY} · 3:08 PM`),
  photo("dog-j", "dog-5", "Ruby", "Yesterday", `${YESTERDAY} · 3:09 PM`),

  photo("latte", "latte", "Morning coffee", "Sat, Nov 7", "Saturday, November 7 · 8:45 AM"),
  photo("roses", "roses", "Roses", "Thu, Nov 5", "Thursday, November 5 · 4:10 PM"),
  photo("autumn", "autumn", "Autumn at the park", "Sun, Nov 1", "Sunday, November 1 · 11:30 AM"),
  photo("pumpkins", "pumpkins", "Pumpkins", "Sat, Oct 31", "Saturday, October 31 · 2:15 PM"),
  photo("pie", "pie", "Apple pie", "Wed, Oct 28", "Wednesday, October 28 · 6:40 PM"),
  photo("market", "market", "Farmers market", "Sat, Oct 24", "Saturday, October 24 · 10:05 AM"),
  photo("sunset", "sunset", "Sunset at the beach", "Sun, Oct 18", "Sunday, October 18 · 6:12 PM"),
  photo("lake", "lake", "Mountain lake", "Sat, Oct 10", "Saturday, October 10 · 12:20 PM"),
  photo("cake", "cake", "Birthday cake", "Fri, Oct 2", "Friday, October 2 · 7:30 PM"),
  photo("hummingbird", "hummingbird", "Hummingbird", "Mon, Sep 14", "Monday, September 14 · 9:50 AM"),
  photo("tulips", "tulips", "Tulips", "Mon, Apr 20", "Monday, April 20 · 1:35 PM"),
  photo("cabin", "cabin", "Snowy cabin", "Sun, Jan 18", "Sunday, January 18 · 10:00 AM"),
  // Placeholder until the user picks: last year's luncheon, so the phone's "today" (Nov 9) and the
  // Nov 21 event stay as they are. To change it, edit this one line (and move it to match its date).
  photo("p-thanksgiving", "thanksgiving", "Thanksgiving luncheon", "Fri, Nov 21, 2025", "Friday, November 21, 2025 · 12:30 PM"),
];
