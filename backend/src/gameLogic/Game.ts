import { Deck } from './Deck.ts';
import { Player } from './Player.ts';
import { Card } from './Card.ts';
import { HandEvaluator } from './HandEvaluator.ts';
import type { EvaluatedHand } from './HandEvaluator.ts';

export type GamePhase = 'pre-flop' | 'flop' | 'turn' | 'river' | 'showdown';
export type Ranking = {
  player: Player;
  hand: EvaluatedHand;
}
type Pot = {
  amount: number;
  eligiblePlayers: Player[];
};

export class Game {
  public deck: Deck = new Deck(); 
  public players: Player[] = [];
  private communityCards: Card[] = []
  private phase: GamePhase = 'pre-flop';
  public currentPlayer: Player | null = null;
  public dealerPostion!: number;
  private pots: Pot[] = [];
  private lastAggressorOnRiver: Player | null = null;

  constructor(players: Player[]) {
    this.players = players;
  }

  startNewRound(dealerPosition: number): void {
    this.phase = 'pre-flop';
    this.communityCards = [];
    this.deck.reset();
    this.deck.shuffle();
    this.players.forEach(player => player.resetHand());
    this.dealerPostion = dealerPosition;
    this.pots = [];
    this.lastAggressorOnRiver = null;

    for (let i = 0; i < 2; i++) {
      const activePlayers = this.players.filter(p => p.chips > 0);
        for (const player of activePlayers) {
          const hand = this.deck.deal(1);
          player.receiveCards(hand);
        }
    }
    this.postBlinds();
  }

  async collectBets(): Promise<void> {
    const activePlayers = this.players.filter(p => !p.hasFolded && p.chips > 0);
    const bets = new Map<Player, number>();
    const smallBlindPlayer = activePlayers.find(p => p.isSmallBlind);
    const bigBlindPlayer = activePlayers.find(p => p.isBigBlind);

    for (const p of activePlayers) {
      bets.set(p, 0);
    }
  
    let currentPlayerIndex: number;
    let lastBet: number;
    let playersWhoActed = new Set<Player>();
    const dealer = this.players[this.dealerPostion];
    const dealerIndexInActive = activePlayers.indexOf(dealer);

    if (this.phase === 'pre-flop') {
      currentPlayerIndex = (dealerIndexInActive + 3) % activePlayers.length; // Start after big blind
      lastBet = 2;
      bets.set(smallBlindPlayer!, 1); 
      bets.set(bigBlindPlayer!, 2); 
      
    } else {
      currentPlayerIndex = (dealerIndexInActive + 1) % activePlayers.length;
      lastBet = 0; // No bets yet
    }
    
  
    while (true) {
      if (activePlayers.length <= 1) break;
      const player = activePlayers[currentPlayerIndex];
      if (player.isAllIn || player.chips === 0 || player.hasFolded) {
        currentPlayerIndex = (currentPlayerIndex + 1) % activePlayers.length;
        continue;
      }
      this.currentPlayer = player;

      const playerBetSoFar = bets.get(player)!;
      const amountToCall = Math.max(lastBet - playerBetSoFar, 0);
      const bet = await player.bet(amountToCall, playerBetSoFar);
      
      const totalBet = playerBetSoFar + bet;
      bets.set(player, totalBet);
      if (player.chips === 0) player.isAllIn = true;  

      if (bet > amountToCall) {
        // Raise
        lastBet = totalBet;
        playersWhoActed = new Set([player]); // Reset – everyone else must respond
        if (this.phase === "river") {
          this.lastAggressorOnRiver = player;
        }
      } else {
        // Called or checked
        playersWhoActed.add(player);
      }
      
      const everyoneMatched = activePlayers.every(p =>
        p.hasFolded || p.isAllIn || (bets.get(p) === lastBet && playersWhoActed.has(p))
      );
      
      // Special pre-flop case: big blind should get option if no one raised
      const bigBlindNeedsOption =
        this.phase === "pre-flop" &&
        bigBlindPlayer &&
        lastBet === 2 &&
        playersWhoActed.size === activePlayers.length - 1 &&
        !playersWhoActed.has(bigBlindPlayer);
      
      if (everyoneMatched && !bigBlindNeedsOption) {
        break;
      }

      currentPlayerIndex = (currentPlayerIndex + 1) % activePlayers.length;
    }
  
    this.currentPlayer = null;
    await new Promise((resolve) => setTimeout(resolve, 1000));
    for (const player of this.players) {
      player.currentBet = 0;
      player.called = false;
    };

    this.calculateSidePots(bets);
  }

  private postBlinds(): void {
    const activePlayers = this.players.filter(p => p.chips > 0);
  
    // Step 1: Find dealer (player before small blind)
    let dealerIndex = this.dealerPostion;
  
    // Move dealer back until you find a player with chips
    while (this.players[dealerIndex].chips === 0) {
      dealerIndex = (dealerIndex - 1 + this.players.length) % this.players.length;
    }
  
    const dealer = this.players[dealerIndex];
    dealer.isDealer = true;
  
    // Step 2: Find active dealer index in filtered list
    const dealerIndexInActive = activePlayers.indexOf(dealer);
  
    if (dealerIndexInActive === -1) {
      throw new Error("Dealer not found in active players");
    }
    // Step 3: Assign blinds
    const smallBlindIndex = (dealerIndexInActive + 1) % activePlayers.length;
    const bigBlindIndex = (dealerIndexInActive + 2) % activePlayers.length;
  
    const smallBlindPlayer = activePlayers[smallBlindIndex];
    const bigBlindPlayer = activePlayers[bigBlindIndex];
  
    smallBlindPlayer.isSmallBlind = true;
    bigBlindPlayer.isBigBlind = true;
  
    const smallBlindAmount = Math.min(1, smallBlindPlayer.chips);
    const bigBlindAmount = Math.min(2, bigBlindPlayer.chips);
  
    smallBlindPlayer.betChips(smallBlindAmount);
    bigBlindPlayer.betChips(bigBlindAmount);
    smallBlindPlayer.currentBet = smallBlindAmount;
    bigBlindPlayer.currentBet = bigBlindAmount;
  }

  private calculateSidePots(bets: Map<Player, number>): void {

    const sorted = Array.from(bets.entries())
      .filter(([_, amount]) => amount > 0)
      .sort((a, b) => a[1] - b[1]);

    while (sorted.length > 0) {
      const minBet = sorted[0][1];
      const eligible = sorted.map(([p]) => p);
      const potAmount = minBet * eligible.length;

      this.pots.push({ amount: potAmount, eligiblePlayers: [...eligible] });

      for (let i = 0; i < sorted.length; i++) {
        sorted[i][1] -= minBet;
      }

      while (sorted.length > 0 && sorted[0][1] === 0) {
        sorted.shift();
      }
    }
  }
  
  

  getPot(): number {
    return this.pots.reduce((acc, pot) => acc + pot.amount, 0);
  }

  rankPlayers(): Ranking[] {
    return this.players
      .filter(p => !p.hasFolded)
      .map(player => {
        const bestHand = HandEvaluator.bestOfSeven([...player.hand, ...this.communityCards]);
        return { player, hand: bestHand };
      })
      .sort((a, b) => HandEvaluator.compareHands(a.hand, b.hand));
  }

  payOut(ranking: Ranking[]): void {

    for (const pot of this.pots) {
      const eligible = pot.eligiblePlayers.filter(p => !p.hasFolded);
      const ranked = ranking.filter(r => eligible.includes(r.player));
      const bestHand = ranked[0].hand;
      const winners = ranked.filter(r => HandEvaluator.compareHands(r.hand, bestHand) === 0).map(r => r.player);
      const share = pot.amount / winners.length;
      winners.forEach(player => player.receiveChips(Math.floor(share)));
      winners.forEach(player => player.winner = true);
    }

    /* ranking.forEach(({ player, hand }, i) => {
      console.log(`#${i + 1}: ${player.name} with ${hand.name} — ${hand.cards.map(c => c.toString()).join(', ')} — chips: ${player.chips}`);
    }); */
    this.players.forEach(player => player.isDealer = false);
  }


  public async collectShowdownChoices(): Promise<void> {
    const activePlayers = this.players.filter(p => !p.hasFolded);
    
    let startIndex: number;
    
    // Determine starting player (last aggressor or player after dealer)
    if (this.lastAggressorOnRiver) {
      const aggressorIndex = activePlayers.findIndex(
        p => p.name === this.lastAggressorOnRiver!.name
      );
      
      if (aggressorIndex !== -1) {
        startIndex = aggressorIndex;
      } else {
        const dealerIndexInActive = activePlayers.findIndex(p => p.isDealer);
        startIndex = dealerIndexInActive === -1 
          ? 0 
          : (dealerIndexInActive + 1) % activePlayers.length;
      }
    } else {
      const dealerIndexInActive = activePlayers.findIndex(p => p.isDealer);
      startIndex = dealerIndexInActive === -1 
        ? 0 
        : (dealerIndexInActive + 1) % activePlayers.length;
    }
    const playersWhoRevealed: Player[] = [];
    
    // Loop through players
    for (let i = 0; i < activePlayers.length; i++) {
      const playerIndex = (startIndex + i) % activePlayers.length;
      const player = activePlayers[playerIndex];
      const isLastPlayer = (i === activePlayers.length - 1);
      
      // Check if any previous players are still "in" (showed both cards)
      const playersStillIn = playersWhoRevealed.slice(0, i).filter(p => p.showBothCards);
      const isLastPlayerStanding = isLastPlayer && playersStillIn.length === 0;
      
      if (isLastPlayerStanding) {
        // Last player wins automatically
        await player.revealCards();
        break; // End showdown early
      } else {
        // Normal showdown choice
        await player.revealCards();
        playersWhoRevealed.push(player);
        
        // After they choose, if they mucked (didn't show both cards), fold them
        if (!player.showBothCards) {
          player.hasFolded = true;
        }
        
        // Check if this was the second-to-last player and they folded
        // If so, the last player auto-wins
        const remainingPlayers = activePlayers.filter(p => !p.hasFolded);
        if (remainingPlayers.length === 1 && !isLastPlayer) { // ⬅️ ADD CHECK
          // Only one player left, give them the choice
          const lastPlayerIndex = (startIndex + i + 1) % activePlayers.length;
          const lastPlayer = activePlayers[lastPlayerIndex];
          
          // Only prompt if they haven't already been processed
          if (!lastPlayer.hasFolded && !playersWhoRevealed.includes(lastPlayer)) { // ⬅️ ADD CHECK
            await lastPlayer.revealCards();
          }
          break;
        }
      }
    }
  }

  getCommunityCards(): Card[] {
    return this.communityCards;
    }

    nextPhase(): void {
        switch (this.phase) {
          case 'pre-flop':
            this.phase = 'flop';
            this.communityCards.push(...this.deck.deal(3));
            break;
          case 'flop':
            this.phase = 'turn';
            this.communityCards.push(...this.deck.deal(1));
            break;
          case 'turn':
            this.phase = 'river';
            this.communityCards.push(...this.deck.deal(1));
            break;
          case 'river':
            this.phase = 'showdown';
            break;
          case 'showdown':
              break;
        }
    }
}