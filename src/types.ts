import { DataTypes } from "brackets-manager";
import { Document, HydratedDocument, Model, ObjectId, Types } from "mongoose";

export type TData<T extends keyof DataTypes> = DataTypes[T];

export type TTournamentTables = "round" | "group" | "stage";

export enum TournamentSubPaths {
    round = "rounds",
    group = "groups",
    stage = "stages",
}

export type TTournamentSubData = TData<keyof typeof TournamentSubPaths>;

export type TTournamentDocument = HydratedDocument<Document<ObjectId>> & {
    [K in keyof Record<TournamentSubPaths, string>]: Types.DocumentArray<Types.ArraySubdocument<ObjectId>>;
};

export type TTournamentModel = Model<any> & {
    findCurrent: () => TTournamentDocument;
    translateSubAliases: (
        table: keyof typeof TournamentSubPaths,
        data: Partial<TTournamentSubData>
    ) => object;
};

