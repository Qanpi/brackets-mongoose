import { Id } from "brackets-model";
import { filter as _filter, matches } from "lodash-es";
import {
    ObjectId,
    Types
} from "mongoose";
import { TTournamentModel, TTournamentSubData, TournamentSubPaths, TTournamentTables } from "./types";

// function isStageData(data: Partial<TSubData>): data is TStageData {
//     return true;
// }

// function isGroupData(data: Partial<TSubData>): data is TGroupData {
//     return true;
// }

// function isRoundData(data: Partial<TSubData>): data is TRoundData {
//     return true;
// }

export default class Tournament<M extends TTournamentModel> {
    private model: M;

    constructor(Tournament: M) {
        this.model = Tournament;
    }

    async insertMany(
        table: TTournamentTables,
        data: TTournamentSubData[]
    ): Promise<Id | boolean> {
        const tournament = this.model.findCurrent();
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
        data: TTournamentSubData
    ): Promise<Id | boolean> {
        const tournament = this.model.findCurrent();
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

    async delete(
        table: TTournamentTables,
        filter?: Partial<TTournamentSubData>
    ): Promise<boolean> {
        const tournament = this.model.findCurrent();
        const path = TournamentSubPaths[table];

        if (!filter) tournament[path].length = 0;
        else {
            const filtered = _filter(
                tournament[path].toObject() as object[],
                !matches(this.model.translateSubAliases(table, filter))
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
