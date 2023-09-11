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
import { isId } from "./types";
import { Id } from "brackets-model";
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

function processIds(obj?: object | Id): object | string {
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

export type TTournamentSubData = DataTypes[keyof typeof TournamentSubPaths] & {
    __t?: string;
};

export type TTournamentDocument = HydratedDocument<Document<Id>> & {
    [K in keyof Record<TournamentSubPaths, string>]: Types.DocumentArray<
        Types.ArraySubdocument<Id>
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
    ): Promise<Id | boolean> {
        const tournament = await this.model.findCurrent();
        const path = TournamentSubPaths[table];
        data.forEach((d) => (d["__t"] = "NumberId"));

        tournament[path].push(...data);

        await tournament.save();
        return true;
    }

    async insertOne(
        table: TTournamentTables,
        data: TTournamentSubData
    ): Promise<Id> {
        const tournament = await this.model.findCurrent();
        const path = TournamentSubPaths[table];
        data["__t"] = "NumberId";

        const doc = tournament[path].create(data);
        tournament[path].push(doc);

        await tournament.save();
        return doc.id === undefined ? -1 : (doc.id as Id);
    }

    async update(
        table: TTournamentTables,
        filter: Partial<TTournamentSubData> | Id,
        data: Partial<TTournamentSubData> | TTournamentSubData
    ): Promise<boolean> {
        const tournament = await this.model.findCurrent();
        const path = TournamentSubPaths[table];

        if (isId(filter)) {
            await this.model.findByIdAndUpdate(filter, data);

            // const updated = tournament[path].filter(d => {
            //     return d.id === filter;
            // }) as Types.DocumentArray<Types.ArraySubdocument<Id>>;

            // tournament.set(path, updated);
            await tournament.save();
            return true;
        }

        tournament[path].forEach((d: Types.ArraySubdocument<Id>) => {
            if (isMatch(d, filter)) tournament.set(filter);
        });

        await tournament.save();
        return true;
    }

    async select(
        table: TTournamentTables,
        filter?: Partial<TTournamentSubData> | Id
    ): Promise<TTournamentSubData | TTournamentSubData[] | null> {
        const tournament = await this.model.findCurrent();
        const path = TournamentSubPaths[table];

        if (isId(filter)) {
            return tournament[path]
                .id(filter)
                ?.toObject() as unknown as Promise<TTournamentSubData>;
        }

        let docs: Types.ArraySubdocument<Id>[];
        if (filter === undefined) docs = tournament[path];
        else {
            docs = tournament[path].filter(
                (d) => isMatch(d, filter)
                // isMatchWith(v, filter, (a, b) => {
                //     if (a instanceof ObjectId) return a.equals(b);
                //     else if (b instanceof ObjectId) return b.equals(a);
                //     else return isEqual(a, b);
                // })
            );
        }

        const lean = docs.map((d) => d.toObject());
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
            ) as unknown as Types.DocumentArray<Types.ArraySubdocument<Id>>;
            tournament[path] = filtered;
        }

        await tournament.save();
        return true;
    }
}
