import { OmitId } from "brackets-manager";
import { Id } from "brackets-model";
import {
    Document,
    FilterQuery,
    HydratedDocument,
    Model,
    ObjectId,
    Types,
} from "mongoose";
import { TData, TTournamentSubData, TTournamentSubPaths } from "./types";

export type TMatchTables = "match_game";

export enum MatchSubPaths {
    match_game = "games",
}
export type TMatchSubData = TData<keyof typeof MatchSubPaths>;

export type TMatchDocument = HydratedDocument<Document<ObjectId>> & {
    [K in keyof Record<MatchSubPaths, string>]: Types.DocumentArray<
        Types.ArraySubdocument<ObjectId>
    >;
};

export default class Match<M extends Model<any>> {
    private model: M;

    constructor(model: M) {
        this.model = model;
    }

    async insertOne(data: OmitId<TData<"match">>): Promise<Id> {
        try {
            const result = (await this.model.create(
                data
            )) as Document<ObjectId>;
            return result._id?.toString() || -1;
        } catch (err) {
            console.error(err);
            return -1;
        }
    }

    async insertManySubdocs(
        table: TMatchTables,
        data: TMatchSubData[]
    ): Promise<Id | boolean> {
        const path = MatchSubPaths[table];

        try {
            for (const game of data) {
                //TODO: could potentially sort and batch this but maybe overkill
                //or just aggregate somehow
                const match = await this.model.findById(game.parent_id) as TMatchDocument;
                match[path].push(game);
                
                await match.save();
            }
            return true;
        } catch (err) {
            console.error(err);
            return false;
        }
    }

    async insertOneSubdoc(
        table: TMatchTables,
        data: TMatchSubData
    ): Promise<Id | boolean> {
        const tournament = this.model.findCurrent();
        const path = MatchSubPaths[table];

        try {
            tournament[path].create(data);
            await tournament.save();
            return true;
        } catch (err) {
            console.error(err);
            return false;
        }
    }

    /**
     *
     * @param data
     */
    async insertMany(data: OmitId<TData<"match">>[]): Promise<boolean> {
        try {
            await this.model.insertMany(data);
            return true;
        } catch (err) {
            console.error(err);
            return false;
        }
    }

    /**
     *
     * @param filter
     */
    async delete(filter?: Partial<TData<"match_game">>): Promise<boolean> {
        try {
            if (!filter) await this.model.deleteMany({});
            if (filter?.id) await this.model.findByIdAndDelete(filter.id);
            else {
                const f = this.model.translateAliases(
                    filter
                ) as FilterQuery<any>;

                await this.model.deleteMany({
                    ...f,
                });
            }
            return true;
        } catch (err) {
            console.error(err);
            return false;
        }
    }
}
