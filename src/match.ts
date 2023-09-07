import { DataTypes } from "brackets-manager";
import { Document, HydratedDocument, Model, Types } from "mongoose";
import Participant from "./participant";
import { CustomId } from "./types";

export enum MatchSubPaths {
    match_game = "games",
}

export type TMatchTables = keyof typeof MatchSubPaths;

export type TMatchDocument = HydratedDocument<Document<CustomId>> & {
    [K in keyof Record<MatchSubPaths, string>]: Types.DocumentArray<
        Types.ArraySubdocument<CustomId>
    >;
};

export default class Match<
    M extends Model<any>,
    T extends keyof DataTypes,
    S extends TMatchTables
> extends Participant<M, T> {
    constructor(model: M) {
        super(model);
    }

    async insertManySubdocs(
        table: TMatchTables,
        data: DataTypes[S][]
    ): Promise<CustomId | boolean> {
        const path = MatchSubPaths[table];

        for (const game of data) {
            //TODO: could potentially sort and batch this but maybe overkill
            //or just aggregate somehow
            const match = (await this.model.findById(
                game.parent_id
            )) as TMatchDocument;
            match[path].push(game);

            await match.save();
        }
        return true;
    }

    async insertOneSubdoc(
        table: TMatchTables,
        data: DataTypes[S]
    ): Promise<CustomId> {
        const path = MatchSubPaths[table];

        const match = (await this.model.findById(
            data.parent_id
        )) as TMatchDocument;

        const game = match.games.create(data);
        match[path].push(game);

        await match.save();
        return game._id?.toString() || -1;
    }

    async selectSubdocs(
        table: TMatchTables,
        filter?: Partial<DataTypes[S]> | CustomId
    ): Promise<DataTypes[S] | DataTypes[S][] | null> {
        return null;
    }

    async updateSubdocs(
        table: TMatchTables,
        filter: Partial<DataTypes[S]> | CustomId,
        data: Partial<DataTypes[S]> | DataTypes[T]
    ): Promise<boolean> {
        return false;
    }

    async deleteSubdocs(
        table: TMatchTables,
        filter?: Partial<DataTypes[S]>
    ): Promise<boolean> {
        return false;
    }
}
