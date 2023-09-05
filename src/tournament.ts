import { DataTypes } from "brackets-manager";
import { Id } from "brackets-model";
import { filter as _filter, isMatch, matches } from "lodash";
import { Document, HydratedDocument, Model, ObjectId, Types } from "mongoose";
import {
    isId,
} from "./types";

// function isStageData(data: Partial<TSubData>): data is TStageData {
//     return true;
// }

// function isGroupData(data: Partial<TSubData>): data is TGroupData {
//     return true;
// }

// function isRoundData(data: Partial<TSubData>): data is TRoundData {
//     return true;
// }

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

export type TTournamentModel = Model<any> & {
    findCurrent: () => Promise<TTournamentDocument>;
    translateSubAliases: (
        table: keyof typeof TournamentSubPaths,
        data: Partial<TTournamentSubData>
    ) => object;
};

export default class Tournament<M extends TTournamentModel> {
    private model: M;

    constructor(Tournament: M) {
        this.model = Tournament;
    }

    async insertMany(
        table: TTournamentTables,
        data: TTournamentSubData[],
    ): Promise<Id | boolean> {
        const tournament = await this.model.findCurrent();
        const path = TournamentSubPaths[table];

        try {
            tournament[path].push(...data);

            await tournament.save();
            return true;
        } catch (err) {
            console.error(err);
            return false;
        }
    }

    async insertOne(
        table: TTournamentTables,
        data: TTournamentSubData,
    ): Promise<Id | boolean> {
        const tournament = await this.model.findCurrent();
        const path = TournamentSubPaths[table];

        try {
            tournament[path].create(data);
            await tournament.save();
            return true;
        } catch (err) {
            console.error(err);
            return false;
        }
    }

    async update(
        table: TTournamentTables,
        filter: Partial<TTournamentSubData> | Id,
        data: Partial<TTournamentSubData> | TTournamentSubData,
    ): Promise<boolean> {
        const tournament = await this.model.findCurrent();
        const path = TournamentSubPaths[table];

        const d = this.model.translateSubAliases(table, data);

        if (isId(filter)) {
            await this.model.findByIdAndUpdate(filter, d);
            return true;
        }

        const f = this.model.translateSubAliases(table, filter);
        tournament[path].forEach((d: Types.ArraySubdocument<ObjectId>) => {
            if (isMatch(d, f)) tournament.set(f);
        });

        await tournament.save();
        return true;
    }

    async select(
        table: TTournamentTables,
        filter?: Partial<TTournamentSubData> | Id,
    ): Promise<TTournamentSubData | TTournamentSubData[] | null> {
        const tournament = await this.model.findCurrent();
        const path = TournamentSubPaths[table];

        if (filter === undefined)
            return tournament[path] as unknown as Promise<TTournamentSubData[]>;
        else if (isId(filter)) {
            return tournament[path].id(
                filter,
            ) as unknown as Promise<TTournamentSubData>;
        }

        return _filter(
            tournament[path].toObject(),
            this.model.translateSubAliases(table, filter),
        ) as unknown as TTournamentSubData[];
    }

    async delete(
        table: TTournamentTables,
        filter?: Partial<TTournamentSubData>,
    ): Promise<boolean> {
        const tournament = await this.model.findCurrent();
        const path = TournamentSubPaths[table];

        if (!filter) tournament[path].length = 0;
        else {
            const filtered = _filter(
                tournament[path].toObject() as object[],
                !matches(this.model.translateSubAliases(table, filter)),
            ) as unknown as Types.DocumentArray<
                Types.ArraySubdocument<ObjectId>
            >;
            tournament[path] = filtered;
        }

        try {
            await tournament.save();
            return true;
        } catch (err) {
            console.error(err);
            return false;
        }
    }
}
