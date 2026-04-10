import type { ObjectId } from "mongodb";

export const FAVORITES_COLLECTION = "favorites";

export type FavoriteDocument = {
  _id: ObjectId;
  userId: ObjectId;
  recipeId: ObjectId;
  createdAt: Date;
};
