import { DataTypes } from "brackets-manager";
import {
    filter as _filter,
    isMatch,
    matches,
    isMatchWith,
    isEqual,
    mapValues,
} from "lodash";
import { Document, HydratedDocument, Model, Query, Types } from "mongoose";
import { isId, CustomId } from "./types";
import { ObjectId } from "mongodb";

// function isStageData(data: Partial<TSubData>): data is TStageData {
//     return true;
// }

// function isGroupData(data: Partial<TSubData>): data is TGroupData {
//     return true;
// }

// function isRoundData(data: Partial<TSubData>): data is TRoundData {
//     return true;
// }

function processIds(obj?: object | CustomId): object | string {
    if (isId(obj)) return obj.toString();

    return mapValues(obj, (v: any) => {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-return
        return v instanceof ObjectId ? v.toString() : v;
    });
}

function stringToObjectIds(obj?: object): object {
    return mapValues(obj, (v: any) => {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-return
        return v instanceof ObjectId ? v.toString() : v;
    });
}

export type TTournamentTables = "round" | "group" | "stage";

export enum TournamentSubPaths {
    round = "rounds",
    group = "groups",
    stage = "stages",
}

export type TTournamentSubData = DataTypes[keyof typeof TournamentSubPaths];

export type TTournamentDocument = HydratedDocument<Document<CustomId>> & {
    [K in keyof Record<TournamentSubPaths, string>]: Types.DocumentArray<
        Types.ArraySubdocument<CustomId>
    >;
};

export type TTournamentModel = Model<any> & {
    findCurrent: () => Query<TTournamentDocument, TTournamentDocument>;
};

export default class Tournament<M extends TTournamentModel> {
    private model: M;

    constructor(Tournament: M) {
        this.model = Tournament;
    }

    async insertMany(
        table: TTournamentTables,
        data: TTournamentSubData[]
    ): Promise<CustomId | boolean> {
        const tournament = await this.model.findCurrent();
        const path = TournamentSubPaths[table];

        tournament[path].push(...data);

        await tournament.save();
        return true;
    }

    async insertOne(
        table: TTournamentTables,
        data: TTournamentSubData
    ): Promise<CustomId> {
        const tournament = await this.model.findCurrent();
        const path = TournamentSubPaths[table];

        const stage = tournament[path].create(data);
        tournament[path].push(stage);

        await tournament.save();
        return stage._id || -1;
    }

    async update(
        table: TTournamentTables,
        filter: Partial<TTournamentSubData> | CustomId,
        data: Partial<TTournamentSubData> | TTournamentSubData
    ): Promise<boolean> {
        const tournament = await this.model.findCurrent();
        const path = TournamentSubPaths[table];

        if (isId(filter)) {
            await this.model.findByIdAndUpdate(filter, data);
            return true;
        }

        tournament[path].forEach((d: Types.ArraySubdocument<CustomId>) => {
            if (isMatch(d, filter)) tournament.set(filter);
        });

        await tournament.save();
        return true;
    }

    async select(
        table: TTournamentTables,
        filter?: Partial<TTournamentSubData> | CustomId
    ): Promise<TTournamentSubData | TTournamentSubData[] | null> {
        const tournament = await this.model.findCurrent();
        const path = TournamentSubPaths[table];

        if (isId(filter)) {
            return tournament[path].id(filter)?.toObject() as unknown as Promise<TTournamentSubData>;
        }

        let docs: Types.ArraySubdocument<CustomId>[];
        if (filter === undefined) docs = tournament[path];
        else {
            docs = tournament[path].filter(d => 
                isMatch(d, filter)
                // isMatchWith(v, filter, (a, b) => {
                //     if (a instanceof ObjectId) return a.equals(b);
                //     else if (b instanceof ObjectId) return b.equals(a);
                //     else return isEqual(a, b);
                // })
            );
        }

        const lean = docs.map(d => d.toObject());
        return lean as TTournamentSubData[];
    }

    async delete(
        table: TTournamentTables,
        filter?: Partial<TTournamentSubData>
    ): Promise<boolean> {
        const tournament = await this.model.findCurrent();
        const path = TournamentSubPaths[table];

        if (!filter) tournament[path].length = 0;
        else {
            const filtered = _filter(
                tournament[path].toObject() as object[],
                !matches(filter)
            ) as unknown as Types.DocumentArray<
                Types.ArraySubdocument<CustomId>
            >;
            tournament[path] = filtered;
        }

        await tournament.save();
        return true;
    }
}
