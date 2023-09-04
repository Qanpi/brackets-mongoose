import { DataTypes } from "brackets-manager";
import { OmitId } from "brackets-manager";
import { Id } from "brackets-model";
import Tournament from "../../models/tournament";
import Participant from "../../models/participant";
import Match from "../../models/match";
import {
  matches as _matches,
  filter as _filter,
  isMatch as _isMatch,
  remove as _remove,
} from "lodash-es";
import { Mongoose } from "mongoose";

export async function handleDelete<T extends keyof DataTypes>(
  mongoose: Mongoose,
  table: T,
  filter?: Partial<DataTypes[T]>
): Promise<boolean> {
  const Tournament = mongoose.model("Tournament") as Model<any>;
  const tournament = await Tournament.findCurrent();
