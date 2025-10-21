import mongoose, { Schema, Document } from "mongoose";

export interface IGameStats extends Document {
  gamesPlayed: number;
  averagePlayersPerGame: number;
}

const gameStatsSchema = new Schema<IGameStats>({
  gamesPlayed: { type: Number, required: true },
  averagePlayersPerGame: { type: Number, required: true },
});

export const GameStats = mongoose.model<IGameStats>("GameStats", gameStatsSchema);
