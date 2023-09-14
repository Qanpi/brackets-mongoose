import { Model } from "mongoose";
import MongooseCRUD from "./crud";

export default class ParticipantCRUD extends MongooseCRUD<Model<any>, "participant"> {}
