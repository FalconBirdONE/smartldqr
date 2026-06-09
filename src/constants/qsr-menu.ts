/**
 * Demo QSR menu for the U4 self-order journey. Kept local (not in SQLite) so the
 * QSR story is self-contained; UPI Lite is the hero rail at this ticket size.
 */

export type MenuItem = {
  id: string;
  name: string;
  price: number;
  desc: string;
  emoji: string;
  /** Customisable items open the "Make it a meal" sheet on add. */
  customisable?: boolean;
};

export type MenuCategory = {
  id: string;
  label: string;
  emoji: string;
  items: MenuItem[];
};

export const QSR_MENU: MenuCategory[] = [
  {
    id: 'chai',
    label: 'Chai',
    emoji: '🍵',
    items: [
      { id: 'chai-masala', name: 'Masala Chai', price: 40, desc: 'Classic spiced milk tea', emoji: '🍵', customisable: true },
      { id: 'chai-ginger', name: 'Ginger Chai', price: 45, desc: 'Fresh ginger, extra warmth', emoji: '🫚', customisable: true },
      { id: 'chai-filter', name: 'Filter Coffee', price: 50, desc: 'South-Indian filter brew', emoji: '☕' },
    ],
  },
  {
    id: 'snacks',
    label: 'Snacks',
    emoji: '🥪',
    items: [
      { id: 'snack-samosa', name: 'Samosa (2pc)', price: 60, desc: 'Crisp, spiced potato', emoji: '🥟' },
      { id: 'snack-sandwich', name: 'Grilled Sandwich', price: 120, desc: 'Veg, mint chutney', emoji: '🥪', customisable: true },
      { id: 'snack-maggi', name: 'Masala Maggi', price: 90, desc: 'Hot, tangy, classic', emoji: '🍜', customisable: true },
    ],
  },
  {
    id: 'combos',
    label: 'Combos',
    emoji: '🍱',
    items: [
      { id: 'combo-chai-samosa', name: 'Chai + Samosa', price: 90, desc: 'The everyday combo', emoji: '🍱' },
      { id: 'combo-power', name: 'Power Breakfast', price: 180, desc: 'Coffee, sandwich, fruit', emoji: '🍳' },
    ],
  },
  {
    id: 'desserts',
    label: 'Sweet',
    emoji: '🍮',
    items: [
      { id: 'sweet-cake', name: 'Choco Lava Cake', price: 110, desc: 'Warm, gooey centre', emoji: '🍫' },
      { id: 'sweet-cookie', name: 'Cookie (2pc)', price: 50, desc: 'Buttery oat & raisin', emoji: '🍪' },
    ],
  },
];

/** Add-ons offered in the customise sheet. */
export const MEAL_UPGRADE = { label: 'Make it a meal', sub: 'Add fries + a drink', price: 70 };

export const SPICE_CHIPS = ['Mild', 'Medium', 'Spicy'];
export const SAUCE_CHIPS = ['Mint', 'Tomato', 'Schezwan', 'No sauce'];

/** Quick-add upsells surfaced on the review screen ("last chance"). */
export const REVIEW_UPSELLS: MenuItem[] = [
  { id: 'up-cookie', name: 'Cookie (2pc)', price: 50, desc: 'Goes great with chai', emoji: '🍪' },
  { id: 'up-water', name: 'Mineral Water', price: 20, desc: '500ml', emoji: '💧' },
  { id: 'up-cake', name: 'Choco Lava Cake', price: 110, desc: 'Warm dessert', emoji: '🍫' },
];
