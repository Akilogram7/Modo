
export type Achievement = {
  id: number;
  name: string;
  description: string;
  emoji: string;
  category: string;
  rarity: 'Common' | 'Uncommon' | 'Rare' | 'Epic' | 'Legendary' | 'Secret';
};

export const RARITY_XP = {
  Common: 5,
  Uncommon: 10,
  Rare: 25,
  Epic: 50,
  Legendary: 100,
  Secret: 200,
} as const;

type Rarity = Achievement['rarity'];

function createAchievement(
  id: number,
  name: string,
  description: string,
  emoji: string,
  category: string,
  rarity: Rarity
): Achievement {
  return { id, name, description, emoji, category, rarity };
}

export const achievements: Achievement[] = [

  // ─────────────── COMMON (+5 XP) ───────────────
  createAchievement(1, 'Flip the Switch', 'Welcome to Modo!', '💡', 'Getting Started', 'Common'),
  createAchievement(2, 'Remix It!', 'Edit a preset mode.', '🎨', 'Getting Started', 'Common'),
  createAchievement(3, 'Built Different', 'Create your first custom mode.', '🏋️', 'Getting Started', 'Common'),
  createAchievement(4, 'New Me, Who Dis?', 'Change your profile Modo.', '💁', 'Getting Started', 'Common'),
  createAchievement(5, 'A Splash of Personality', 'Change your profile colour.', '🎨', 'Getting Started', 'Common'),
  createAchievement(6, 'Warming Up', 'Activate a custom mode.', '💪', 'Getting Started', 'Common'),
  createAchievement(7, 'The Modo Lab', 'Create 3 modes.', '🧪', 'Getting Started', 'Common'),
  createAchievement(8, 'Testing the Waters', 'Activate any mode 3 times in total.', '🐠', 'Getting Started', 'Common'),
  createAchievement(9, 'Modo Architect', 'Create 5 modes.', '🏗️', 'Getting Started', 'Common'),
  createAchievement(10, 'High Five!', 'Activate any mode 5 times in total.', '🖐️', 'Getting Started', 'Common'),
  createAchievement(11, 'The Full Menu', 'Try all three preset modes.', '🥘', 'Getting Started', 'Common'),
  createAchievement(12, 'Here We Go Again', 'Activate modes 10 times in total.', '🔁', 'Mode Usage', 'Common'),
  createAchievement(13, 'Getting Into the Groove', 'Activate modes 15 times in total.', '☕', 'Mode Usage', 'Common'),
  createAchievement(14, 'Streak Sprout', 'Use a mode on 3 consecutive days.', '🌿', 'Consistency', 'Common'),
  createAchievement(15, 'A Tiny Victory', 'Accumulate 1 minute of mode time.', '🌱', 'Total Time', 'Common'),
  createAchievement(16, 'Pocket-Sized Progress', 'Accumulate 5 minutes of mode time.', '🪙', 'Total Time', 'Common'),
  createAchievement(17, 'Minute by Minute', 'Accumulate 10 minutes of mode time.', '⏱️', 'Total Time', 'Common'),
  createAchievement(18, 'Finding Your Feet', 'Accumulate 15 minutes of mode time.', '👣', 'Total Time', 'Common'),
  createAchievement(19, 'Half an Hour of Power', 'Accumulate 30 minutes of mode time.', '⏳', 'Total Time', 'Common'),
  createAchievement(20, 'An Hour? Already?', 'Accumulate 1 hour of mode time.', '⏰', 'Total Time', 'Common'),
  createAchievement(21, "Blink and You'll Miss It", 'Complete a mode session lasting at least 1 minute.', '⚡', 'Sessions', 'Common'),
  createAchievement(22, 'Quick Quest', 'Complete a mode session lasting at least 5 minutes.', '🐇', 'Sessions', 'Common'),
  createAchievement(23, 'Mini Mission', 'Complete a mode session lasting at least 10 minutes.', '🎯', 'Sessions', 'Common'),
  createAchievement(24, 'Pomodoro Potato', 'Complete a mode session lasting at least 25 minutes.', '🥔', 'Sessions', 'Common'),
  createAchievement(25, 'My Favourite!', 'Accumulate 1 hour using a single mode.', '💖', 'Mode Loyalty', 'Common'),
  createAchievement(26, 'Back for More', 'Activate the same mode on 2 different days.', '🔄', 'Mode Loyalty', 'Common'),
  createAchievement(27, 'Mix & Match', 'Use 2 different modes on the same day.', '🔀', 'Mode Variety', 'Common'),
  createAchievement(28, 'The First of Many', 'Unlock 5 achievements.', '🏅', 'Milestones', 'Common'),
  createAchievement(29, 'Achievement Unlocked!', 'Unlock 10 achievements.', '🏆', 'Milestones', 'Common'),
  createAchievement(30, 'Getting the Hang of It', 'Use Modo on 5 different days.', '🌼', 'Milestones', 'Common'),
  // ─────────────── UNCOMMON (+10 XP) ───────────────
  createAchievement(31, 'Creature of Habit', 'Activate modes 25 times in total.', '☕', 'Mode Usage', 'Uncommon'),
  createAchievement(32, 'Halfway There!', 'Activate modes 50 times in total.', '🎯', 'Mode Usage', 'Uncommon'),
  createAchievement(33, 'The Daily Grind', 'Activate modes 7 times in one week.', '⚙️', 'Mode Usage', 'Uncommon'),
  createAchievement(34, 'Déjà Modo', 'Activate the same mode 10 times in total.', '🔁', 'Mode Usage', 'Uncommon'),
  createAchievement(35, 'Old Reliable', 'Activate the same mode 25 times in total.', '🧸', 'Mode Usage', 'Uncommon'),
  createAchievement(36, 'Seven-Day Swagger', 'Use a mode on 7 consecutive days.', '🌈', 'Consistency', 'Uncommon'),
  createAchievement(37, 'Showing Up Counts', 'Use Modo on 14 different days.', '📆', 'Consistency', 'Uncommon'),
  createAchievement(38, 'The Comeback Kid', 'Activate a mode after at least 7 days without using Modo.', '🎉', 'Consistency', 'Uncommon'),
  createAchievement(39, 'A Familiar Face', 'Use the same mode on 5 different days.', '😊', 'Consistency', 'Uncommon'),
  createAchievement(40, 'Comfort Zone', 'Use the same mode on 10 different days.', '🛋️', 'Consistency', 'Uncommon'),
  createAchievement(41, 'Monday Motivation', 'Activate a mode on 3 different Mondays.', '☀️', 'Consistency', 'Uncommon'),
  createAchievement(42, 'Time Flies!', 'Accumulate 90 minutes of mode time.', '🪽', 'Total Time', 'Uncommon'),
  createAchievement(43, 'The Return Ticket', 'Complete a mode session lasting at least 10 minutes on 3 different days.', '🎟️', 'Sessions', 'Uncommon'),
  createAchievement(44, 'Playlist Shuffle', 'Activate 3 different modes within one week.', '🎶', 'Mode Variety', 'Uncommon'),
  createAchievement(45, 'Small Steps, Big Habit', 'Accumulate at least 15 minutes of mode time on 4 different days.', '🌷', 'Consistency', 'Uncommon'),
  createAchievement(46, 'The Time Vault', 'Accumulate 5 hours of mode time.', '🗝️', 'Total Time', 'Uncommon'),
  createAchievement(47, 'In the Zone', 'Complete a mode session lasting at least 90 minutes.', '🎧', 'Sessions', 'Uncommon'),
  createAchievement(48, 'Locked In', 'Complete a mode session lasting at least 2 hours.', '🔐', 'Sessions', 'Uncommon'),
  createAchievement(49, "We're Besties Now", 'Accumulate 3 hours in one mode.', '💞', 'Mode Loyalty', 'Uncommon'),
  createAchievement(50, "It's Getting Serious", 'Accumulate 5 hours in one mode.', '💛', 'Mode Loyalty', 'Uncommon'),
  createAchievement(51, 'The Perfect Pair', 'Activate a preset and custom mode on the same day.', '🧩', 'Mode Variety', 'Uncommon'),
  createAchievement(52, 'Just Right', "Edit a custom mode's settings.", '🪡', 'Personalization', 'Uncommon'),
  createAchievement(53, 'Badge Collector', 'Unlock 15 achievements.', '🎖️', 'Milestones', 'Uncommon'),
  createAchievement(54, 'On a Roll!', 'Unlock 20 achievements.', '🎲', 'Milestones', 'Uncommon'),
  createAchievement(55, 'Collection Growing', 'Unlock 25 achievements.', '🪴', 'Milestones', 'Uncommon'),
  // ─────────────── RARE (+25 XP) ───────────────
  createAchievement(56, 'Triple Digits, Baby!', 'Activate modes 100 times in total.', '💯', 'Mode Usage', 'Rare'),
  createAchievement(57, 'Modo Maniac', 'Activate modes 150 times in total.', '🤪', 'Mode Usage', 'Rare'),
  createAchievement(58, "Can't Get Enough", 'Activate modes 200 times in total.', '🌀', 'Mode Usage', 'Rare'),
  createAchievement(59, 'Certified Regular', 'Activate the same mode 50 times in total.', '📜', 'Mode Usage', 'Rare'),
  createAchievement(60, 'My Ride or Die', 'Activate the same mode 75 times in total.', '🚲', 'Mode Usage', 'Rare'),
  createAchievement(61, 'Streak Season', 'Use a mode on 14 consecutive days.', '💃', 'Consistency', 'Rare'),
  createAchievement(62, 'Three Weeks Strong', 'Use a mode on 21 consecutive days.', '💪', 'Consistency', 'Rare'),
  createAchievement(63, 'Pages of Progress', 'Use Modo on 30 different days.', '🗓️', 'Consistency', 'Rare'),
  createAchievement(64, 'Old Habits, New Tricks', 'Use the same mode on 30 different days.', '📆', 'Consistency', 'Rare'),
  createAchievement(65, 'Habit Habitat', 'Use the same mode on 15 different days.', '🌿', 'Consistency', 'Rare'),
  createAchievement(66, 'Lucky Number Seven', 'Accumulate 7 hours of mode time.', '🍀', 'Total Time', 'Rare'),
  createAchievement(67, 'Hours in the Bank', 'Accumulate 10 hours of mode time.', '🪙', 'Total Time', 'Rare'),
  createAchievement(68, 'A Match Made in Modo', 'Accumulate 10 hours in one mode.', '🧡', 'Mode Loyalty', 'Rare'),
  createAchievement(69, 'Attached at the Hip', 'Accumulate 25 hours in one mode.', '🧷', 'Mode Loyalty', 'Rare'),
  createAchievement(70, 'The Dream Team', 'Use 3 different modes on 5 different days.', '🤝', 'Mode Variety', 'Rare'),
  createAchievement(71, 'The Trophy Shelf', 'Unlock 30 achievements.', '🏆', 'Milestones', 'Rare'),
  createAchievement(72, 'Four Corners', 'Complete a mode session lasting at least 25 minutes in 4 different modes.', '🧭', 'Mode Variety', 'Rare'),
  createAchievement(73, 'Shiny Things!', 'Unlock 40 achievements.', '✨', 'Milestones', 'Rare'),
  createAchievement(74, 'The Long-Form Habit', 'Complete a mode session lasting at least 25 minutes on 10 different days.', '🎬', 'Sessions', 'Rare'),
  createAchievement(75, 'Half the Collection!', 'Unlock 50 achievements.', '🥇', 'Milestones', 'Rare'),
  // ─────────────── EPIC (+50 XP) ───────────────
  createAchievement(76, 'Quarter Thousand', 'Activate modes 250 times in total.', '🎯', 'Mode Usage', 'Epic'),
  createAchievement(77, 'The Modo Machine', 'Activate modes 300 times in total.', '🤖', 'Mode Usage', 'Epic'),
  createAchievement(78, 'Certified Obsessed', 'Activate the same mode 100 times in total.', '🏅', 'Mode Usage', 'Epic'),
  createAchievement(79, 'Fifty Shades of Modo', 'Use Modo on 50 different days.', '🎨', 'Consistency', 'Epic'),
  createAchievement(80, 'Routine Royalty', 'Use the same mode on 30 consecutive days.', '🦋', 'Consistency', 'Epic'),
  createAchievement(81, 'Keeper of Hours', 'Accumulate 12 hours of mode time.', '🕰️', 'Total Time', 'Epic'),
  createAchievement(82, 'The Slow Burn', 'Accumulate 15 hours of mode time.', '🌟', 'Total Time', 'Epic'),
  createAchievement(83, 'The Long Haul', 'Accumulate 20 hours of mode time.', '🔮', 'Total Time', 'Epic'),
  createAchievement(84, 'A Day Well Spent', 'Accumulate 24 hours of mode time.', '🌞', 'Total Time', 'Epic'),
  createAchievement(85, 'Time Traveller', 'Accumulate 36 hours of mode time.', '🚀', 'Total Time', 'Epic'),
  createAchievement(86, 'Partners in Crime', 'Accumulate 50 hours in one mode.', '🤜🤛', 'Mode Loyalty', 'Epic'),
  createAchievement(87, 'Swiss Army Modo', 'Accumulate at least 5 hours in each of 3 different modes.', '🛠️', 'Mode Variety', 'Epic'),
  createAchievement(88, 'Badge Bonanza', 'Unlock 60 achievements.', '🎊', 'Milestones', 'Epic'),
  createAchievement(89, 'Modo in Motion', 'Complete 50 mode sessions lasting at least 25 minutes each.', '🚀', 'Sessions', 'Epic'),
  createAchievement(90, 'Three-Quarter Club', 'Unlock 75 achievements.', '🥇', 'Milestones', 'Epic'),
  // ─────────────── LEGENDARY (+100 XP) ───────────────
  createAchievement(91, 'The 500 Club', 'Activate modes 500 times in total.', '🏅', 'Mode Usage', 'Legendary'),
  createAchievement(92, 'Modo Overlord', 'Activate modes 750 times in total.', '👑', 'Mode Usage', 'Legendary'),
  createAchievement(93, 'A Year in the Making', 'Use Modo on 365 different days.', '🎂', 'Consistency', 'Legendary'),
  createAchievement(94, 'Old Faithful', 'Use the same mode on 100 different days.', '🌳', 'Consistency', 'Legendary'),
  createAchievement(95, 'Till the End of Time', 'Accumulate 100 hours in one mode.', '♾️', 'Mode Loyalty', 'Legendary'),
  createAchievement(96, 'The Final Stretch', 'Unlock 90 achievements.', '🌠', 'Milestones', 'Legendary'),
  createAchievement(97, 'Modo Master', 'Unlock all other 99 achievements.', '🏆', 'Milestones', 'Legendary'),
  // ─────────────── SECRET (+200 XP) ───────────────
  createAchievement(98, 'The Early Worm', 'Activate a mode before 7 AM.', '🐛', 'Secrets', 'Secret'),
  createAchievement(99, 'Night Owl', 'Activate a mode after 11 PM.', '🦉', 'Secrets', 'Secret'),
  createAchievement(100, 'Weekend Warrior', 'Activate a mode on both Saturday and Sunday of the same weekend.', '🎮', 'Secrets', 'Secret'),
];
