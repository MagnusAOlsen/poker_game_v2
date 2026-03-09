import mongoose from "mongoose";

interface IDailyGameStats {
  date: Date;                    
  gamesPlayed: number;     
  totalPlayers: number;          
  averagePlayersPerGame: number; 
}
interface ITotalGameStats {
  totalGamesPlayed: number;     
  totalPlayers: number;          
  averagePlayersPerGame: number; 
}

const totalGameStatsSchema = new mongoose.Schema<ITotalGameStats>({
  totalGamesPlayed: { 
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

const dailyGameStatsSchema = new mongoose.Schema<IDailyGameStats>({
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

export const DailyGameStats = mongoose.model<IDailyGameStats>("DailyGameStats", dailyGameStatsSchema);
export const TotalGameStats = mongoose.model<ITotalGameStats>("TotalGameStats", totalGameStatsSchema);


export function getStartOfDay(date: Date = new Date()): Date {
  return new Date(Date.UTC(
    date.getUTCFullYear(),
    date.getUTCMonth(),
    date.getUTCDate(),
    0, 0, 0, 0
  ));
}

async function updateDailyGameStats(playerCount: number, newPlayersAdded?:number) {
  const today = getStartOfDay();

  try {
    let stats = await DailyGameStats.findOne({ date: today });

    if (!stats) {
      stats = new DailyGameStats({
        date: today,
        gamesPlayed: 1,
        totalPlayers: playerCount,
        averagePlayersPerGame: playerCount
      });
    } else {
      if (newPlayersAdded) {
        stats.totalPlayers += newPlayersAdded;
        stats.averagePlayersPerGame = stats.totalPlayers / stats.gamesPlayed;
      }
      else {
      stats.gamesPlayed += 1;
      stats.totalPlayers += playerCount;
      stats.averagePlayersPerGame = stats.totalPlayers / stats.gamesPlayed;
    }}

    await stats.save();
    console.log(`Updated stats for ${today.toDateString()}: ${stats.gamesPlayed} games, avg ${stats.averagePlayersPerGame.toFixed(1)} players`);
  } catch (error) {
    console.error("Failed to update game stats:", error);
  } 
}

async function updateTotalGameStats(playerCount: number, newPlayersAdded?:number) {
  try {
    let stats = await TotalGameStats.findOne();

    if (!stats) {
      stats = new TotalGameStats({
        totalGamesPlayed: 1,
        totalPlayers: playerCount,
        averagePlayersPerGame: playerCount
      });
    } else {
      if (newPlayersAdded) {
        stats.totalPlayers += newPlayersAdded;
        stats.averagePlayersPerGame = stats.totalPlayers / stats.totalGamesPlayed;
      }
      else {
      stats.totalGamesPlayed += 1;
      stats.totalPlayers += playerCount;
      stats.averagePlayersPerGame = stats.totalPlayers / stats.totalGamesPlayed;
    }}

    await stats.save();
    console.log(`Updated total games played: ${stats.totalGamesPlayed} games, avg ${stats.averagePlayersPerGame.toFixed(1)} players`);
  } catch (error) {
    console.error("Failed to update total game stats:", error);
  } 
}


export function updateGameStats(playerCount: number, newPlayersAdded?:number) {
  updateDailyGameStats(playerCount, newPlayersAdded);
  updateTotalGameStats(playerCount, newPlayersAdded);
 
}