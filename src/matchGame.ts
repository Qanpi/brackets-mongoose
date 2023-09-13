import { Model } from "mongoose";
import MongooseCRUD from "./crud";


export default class MatchGame extends MongooseCRUD<Model<any>, "match_game">{}
