// cards.js — shared card data module for solitaire and future card games

export const SUITS = ['hearts', 'diamonds', 'clubs', 'spades'];
export const RANKS = ['ace', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'jack', 'queen', 'king'];

export const RANK_VALUES = {
  ace: 1, '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7, '8': 8,
  '9': 9, '10': 10, jack: 11, queen: 12, king: 13
};

export const RANK_THEMES = {
  ace: 'Original', '2': 'Twin', '3': 'Games', '4': 'Order', '5': 'Progress',
  '6': 'Presence', '7': 'Luck', '8': 'Flow', '9': 'Energy', '10': 'Absolute',
  jack: 'Brat', queen: 'Abundance', king: 'Control'
};

const CARD_NAMES = {
  'ace-hearts': 'Madrone', '2-hearts': 'Sun & Moon', '3-hearts': 'Love', '4-hearts': 'Dragonfly',
  '5-hearts': 'Hummingbird', '6-hearts': 'Afternoon', '7-hearts': 'Rose', '8-hearts': 'Fall',
  '9-hearts': 'San Francisco', '10-hearts': 'Heart', 'jack-hearts': 'Staffordshire Statues',
  'queen-hearts': "Perdita's Bundles of Love", 'king-hearts': 'Bard',
  'ace-diamonds': 'Redwood', '2-diamonds': 'Yin & Yang', '3-diamonds': 'Yes / No', '4-diamonds': 'Bee',
  '5-diamonds': 'Eagle', '6-diamonds': 'Morning', '7-diamonds': 'Salvia', '8-diamonds': 'Winter',
  '9-diamonds': 'Tokyo', '10-diamonds': 'Eyes', 'jack-diamonds': 'Prince Dragon',
  'queen-diamonds': 'Eve & Apple', 'king-diamonds': 'Alchemist',
  'ace-clubs': 'Willow', '2-clubs': 'Mirror', '3-clubs': 'Forecast', '4-clubs': 'Butterfly',
  '5-clubs': 'Raven', '6-clubs': 'Evening', '7-clubs': 'Dahlia', '8-clubs': 'Summer',
  '9-clubs': 'New York', '10-clubs': 'Hand', 'jack-clubs': 'Cloud Casper',
  'queen-clubs': 'Alice in Wonderland', 'king-clubs': 'Cowboy',
  'ace-spades': 'Cherry Blossom', '2-spades': 'Life & Death', '3-spades': 'Wishing for Growth',
  '4-spades': 'Ladybug', '5-spades': 'Hawk', '6-spades': 'Night', '7-spades': 'Hyacinth',
  '8-spades': 'Spring', '9-spades': 'London', '10-spades': 'Mouth', 'jack-spades': 'Toll Keeper',
  'queen-spades': 'Grandmother Tree', 'king-spades': 'Gardener'
};

export const BACK_IMAGE = '../cards/back.jpg';

export function createCard(rank, suit) {
  const id = `${rank}-${suit}`;
  const color = (suit === 'hearts' || suit === 'diamonds') ? 'red' : 'black';
  const displayColor = (suit === 'hearts' || suit === 'diamonds') ? 'pink' : 'green';
  return {
    id,
    rank,
    suit,
    value: RANK_VALUES[rank],
    color,
    displayColor,
    name: CARD_NAMES[id],
    theme: RANK_THEMES[rank],
    image: `../cards/${rank}-${suit}.jpg`
  };
}

export function createDeck() {
  const deck = [];
  for (const suit of SUITS) {
    for (const rank of RANKS) {
      deck.push(createCard(rank, suit));
    }
  }
  return deck;
}

export function shuffle(array) {
  const result = [...array];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}
