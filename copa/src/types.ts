import { DataTypes } from "brackets-manager";
import { Id } from "brackets-model";
import { Document, HydratedDocument, Model, ObjectId, Types } from "mongoose";

// export type DataTypes[T extends keyof DataTypes] = DataTypes[T];

export type TTournamentTables = "round" | "group" | "stage";

export enum TournamentSubPaths {
    round = "rounds",
    group = "groups",
    stage = "stages",
}

export type TTournamentSubData = DataTypes[keyof typeof TournamentSubPaths];

export type TTournamentDocument = HydratedDocument<Document<ObjectId>> & {
    [K in keyof Record<TournamentSubPaths, string>]: Types.DocumentArray<Types.ArraySubdocument<ObjectId>>;
};

export function isId(id: any | Id): id is Id {
    return typeof id === "string" || typeof id === "number";
}

export type TTournamentModel = Model<any> & {
    findCurrent: () => Promise<TTournamentDocument>;
    translateSubAliases: (
        table: keyof typeof TournamentSubPaths,
        data: Partial<TTournamentSubData>
    ) => object;
};

