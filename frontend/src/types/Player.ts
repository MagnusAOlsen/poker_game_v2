import type { Card } from './Card';

export interface Player {
  hand: Card[];
  chips: number;
  name: string;
  hasFolded: boolean;
  position: number;
  isDealer: boolean;
  isSmallBlind: boolean;
  isBigBlind: boolean;
  isAllIn: boolean;
  showLeftCard: boolean;
  showRightCard: boolean;
  showBothCards: boolean;
  showNone: boolean;
  addOn: boolean;
  leave: boolean;
  avatar?: string;
  currentBet: number;
  called: boolean;
  winner: boolean;
  gameCode?: string;
}