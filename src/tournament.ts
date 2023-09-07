import { DataTypes } from "brackets-manager";
import { filter as _filter, isMatch, matches } from "lodash";
import { Document, HydratedDocument, Model, Types } from "mongoose";
import { isId, CustomId } from "./types";

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

export type TTournamentDocument = HydratedDocument<Document<CustomId>> & {
    [K in keyof Record<TournamentSubPaths, string>]: Types.DocumentArray<
        Types.ArraySubdocument<CustomId>
    >;
};

export type TTournamentModel = Model<any> & {
    findCurrent: () => Promise<TTournamentDocument>;
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

        if (filter === undefined)
            return tournament[path] as unknown as Promise<TTournamentSubData[]>;
        else if (isId(filter)) {
            return tournament[path].id(
                filter
            ) as unknown as Promise<TTournamentSubData>;
        }

        return _filter(
            tournament[path].toObject(),
            filter
        ) as unknown as TTournamentSubData[];
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
