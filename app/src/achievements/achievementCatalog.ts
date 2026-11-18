
export type Achievement = {
  id: number;
  name: string;
  description: string;
  category: string;
  rarity: 'Common' | 'Uncommon' | 'Rare' | 'Epic' | 'Legendary' | 'Secret';
};

export const achievements: Achievement[] = [
  {
    id: 1,
    name: 'Flip the Switch',
    description: 'Activate your first mode.',
    category: 'Getting Started',
    rarity: 'Common',
  },
  {
    id: 2,
    name: 'Remix It!',
    description: 'Edit a preset mode.',
    category: 'Getting Started',
    rarity: 'Common',
  },
  {
    id: 3,
    name: 'Built Different',
    description: 'Create your first custom mode.',
    category: 'Getting Started',
    rarity: 'Common',
  },
  {
    id: 4,
    name: 'New Me, Who Dis?',
    description: 'Change your profile Modo.',
    category: 'Getting Started',
    rarity: 'Common',
  },
  {
    id: 5,
    name: 'A Splash of Personality',
    description: 'Change your profile colour.',
    category: 'Getting Started',
    rarity: 'Common',
  },
];