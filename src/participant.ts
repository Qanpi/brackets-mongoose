import { Model } from "mongoose";
import MongooseCRUD from "./crud";

export default class Participant extends MongooseCRUD<Model<any>, "participant"> {}
