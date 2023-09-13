import { DataTypes } from "brackets-manager";
import {
    Document,
    HydratedDocument,
    Model,
    SchemaTypes,
    Types,
} from "mongoose";
import MongooseCRUD from "./crud";
import { isId } from "./types";
import { Id } from "brackets-model";
import { isMatch } from "lodash";

export enum MatchSubPaths {
    match_game = "games",
}

export type TMatchTables = keyof typeof MatchSubPaths;

export type TMatchDocument = HydratedDocument<Document<Id>> & {
    [K in keyof Record<MatchSubPaths, string>]: Types.DocumentArray<
        Types.ArraySubdocument<Id>
    >;
};

export default class Match extends MongooseCRUD<Model<any>, "match">{}
