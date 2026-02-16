/* import * as readline from 'readline'; */
import { Card } from './Card.ts';


//Used to check the game logic in terminal
/* function askQuestion(query: string): Promise<string> {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });
  
    return new Promise(resolve =>
      rl.question(query, answer => {
        rl.close();
        resolve(answer);
      })
    );
  } */
 

export class Player {
  hand: Card[] = [];
  chips: number;
  name: string;
  hasFolded: boolean = false;
  position!: number; //! means that it will definitely be assigned later
  private resolveBet?: (amount: number) => void;
  public notifyTurn?: (playerName: string) => void;
  public notifyShowdown?: (playerName: string) => void;
  private resolveReveal?: () => void;
  public isDealer: boolean = false;
  public isSmallBlind: boolean = false;
  public isBigBlind: boolean = false;
  public isAllIn: boolean = false;
  public showLeftCard: boolean = false;
  public showRightCard: boolean = false;
  public showBothCards: boolean = false;
  public showNone: boolean = false;
  public addOn: boolean = false;
  public leave: boolean = false;
  public avatar?: string;
  public currentBet: number = 0;
  public called: boolean = false;
  public winner: boolean = false;
  public gameCode?: string;

  constructor(name: string, startingChips: number = 150) {
    this.name = name;
    this.chips = startingChips;
  }

  receiveCards(cards: Card[]): void {
    this.hand = [...this.hand, ...cards];
  }

  receiveChips(amount: number): void {
    this.chips += amount;
  }

  betChips(amount: number): void {
    this.chips -= amount;
  };


  public async bet(amountToCall: number, playerBetSoFar: number): Promise<number> {
    if (this.notifyTurn) {
      this.notifyTurn(this.name);
    }

    return new Promise((resolve) => {
      this.resolveBet = (amount: number) => {
        if (amount === -2) {
          this.fold();
          resolve(0);}
        else if (amount === -1) {
          const bet = Math.min(this.chips, amountToCall);
          this.currentBet = bet + playerBetSoFar;
          this.chips -= bet;
          if (this.chips === 0) this.isAllIn = true;
          resolve(bet);
        }
        else {
          const bet = Math.min(amount, this.chips);
          this.currentBet = bet + playerBetSoFar;
          this.chips -= bet;
          if (this.chips === 0) this.isAllIn = true;
          resolve(bet);
        }
      };
    });
  }
  public async revealCards(): Promise<void> {
    if (this.notifyShowdown) {
      this.notifyShowdown(this.name);
    }

    return new Promise((resolve) => {
      this.resolveReveal = () => {
        resolve();
      };
    });
  }
  public respondToShowdown(): void {
    if (this.resolveReveal) {
      this.resolveReveal();
      this.resolveReveal = undefined;
    }
  }

  respondToBet(amount: number): void {
    if (this.resolveBet) {
      this.resolveBet(amount);
      this.resolveBet = undefined; 
    }
  }


  fold(): void {
    this.hand = [];
    this.hasFolded = true;
  }

  resetHand(): void {
    this.hand = [];
    this.hasFolded = false;
    this.resolveBet = undefined; // Reset the bet resolver
    this.isAllIn = false;
    this.isSmallBlind = false;
    this.isBigBlind = false;
    this.isDealer = false;
    this.showLeftCard = false;
    this.showRightCard = false;
    this.showBothCards = false;
    this.showNone = false;
    this.winner = false;
  }
}
