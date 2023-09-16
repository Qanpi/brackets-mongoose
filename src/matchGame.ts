import { Model } from "mongoose";
import MongooseCRUD from "./crud";
import { Id, MatchGame } from "brackets-model";

export default class MatchGameCRUD extends MongooseCRUD<Model<any>, "match_game"> {}
