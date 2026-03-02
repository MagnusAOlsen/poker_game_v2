import mongoose from "mongoose";

interface IGameStats {
  date: Date;                    
  gamesPlayed: number;     
  totalPlayers: number;          
  averagePlayersPerGame: number; 
}

const gameStatsSchema = new mongoose.Schema<IGameStats>({
  date: { 
    type: Date, 
    required: true,
    unique: true,  // One document per day
    index: true 
  },
  gamesPlayed: { 
    type: Number, 
    default: 0 
  },
  totalPlayers: { 
    type: Number, 
    default: 0 
  },
  averagePlayersPerGame: { 
    type: Number, 
    default: 0 
  }
}, {
  timestamps: true
});

export const GameStats = mongoose.model<IGameStats>("GameStats", gameStatsSchema);


export function getStartOfDay(date: Date = new Date()): Date {
  return new Date(Date.UTC(
    date.getUTCFullYear(),
    date.getUTCMonth(),
    date.getUTCDate(),
    0, 0, 0, 0
  ));
}

export async function updateGameStats(playerCount: number) {
  const today = getStartOfDay();

  try {
    let stats = await GameStats.findOne({ date: today });

    if (!stats) {
      stats = new GameStats({
        date: today,
        gamesPlayed: 1,
        totalPlayers: playerCount,
        averagePlayersPerGame: playerCount
      });
    } else {
      stats.gamesPlayed += 1;
      stats.totalPlayers += playerCount;
      stats.averagePlayersPerGame = stats.totalPlayers / stats.gamesPlayed;
    }

    await stats.save();
    console.log(`Updated stats for ${today.toDateString()}: ${stats.gamesPlayed} games, avg ${stats.averagePlayersPerGame.toFixed(1)} players`);
  } catch (error) {
    console.error("Failed to update game stats:", error);
  }
}