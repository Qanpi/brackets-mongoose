import { CrudInterface, DataTypes, OmitId } from "brackets-manager";
import mongoose, { Model, Mongoose } from "mongoose";
import ParticipantCRUD from "./participant";
import TournamentCRUD, {
    TTournamentModel,
    TTournamentSubData,
    TTournamentTables,
} from "./tournament";
import MatchCRUD from "./match";
import { Id } from "brackets-model";
import MatchGameCRUD from "./matchGame";

enum Tables {
    Participant = "participant",
    Stage = "stage",
    Group = "group",
    Round = "round",
    Match = "match",
    MatchGame = "match_game",
}

export default class MongooseForBrackets implements CrudInterface {
    private tournament: TournamentCRUD<TTournamentModel>;
    private participant: ParticipantCRUD;
    private match: MatchCRUD;
    private match_game: MatchGameCRUD;

    constructor(mongoose: Mongoose) {
        //FIXME: don't rely on magic strings
        this.tournament = new TournamentCRUD(
            mongoose.model("Tournament") as TTournamentModel
        );
        this.participant = new ParticipantCRUD(
            mongoose.model("Participant").discriminators!["ParticipantNumberId"]
        );
        this.match = new MatchCRUD(
            mongoose.model("Match").discriminators!["MatchNumberId"]
        );
        this.match_game = new MatchGameCRUD(
            mongoose.model("MatchGame").discriminators!["MatchGameNumberId"]
        );
    }

    insert<T extends keyof DataTypes>(
        table: T,
        data: OmitId<DataTypes[T]>
    ): Promise<number>;
    insert<T extends keyof DataTypes>(
        table: T,
        data: OmitId<DataTypes[T]>[]
    ): Promise<boolean>;
    async insert<T extends keyof DataTypes>(
        table: T,
        data: OmitId<DataTypes[T]>[] | OmitId<DataTypes[T]>
    ): Promise<Id | boolean> {
        switch (table) {
            case Tables.Participant:
                return this.participant.insert(
                    data as
                        | OmitId<DataTypes["participant"]>[]
                        | OmitId<DataTypes["participant"]>
                );
            case Tables.Match:
                return this.match.insert(
                    data as
                        | OmitId<DataTypes["match"]>[]
                        | OmitId<DataTypes["match"]>
                );
            case Tables.MatchGame:
                return this.match_game.insert(
                    data as
                        | OmitId<DataTypes["match_game"]>[]
                        | OmitId<DataTypes["match_game"]>
                );
            case Tables.Stage:
            case Tables.Group:
            case Tables.Round:
                return this.tournament.insert(
                    table,
                    data as
                        | OmitId<TTournamentSubData>[]
                        | OmitId<TTournamentSubData>
                );
            // if (Array.isArray(data)) {
            //     return this.match.insertMany(
            //         data as unknown as DataTypes[Tables.Match][]
            //     );
            // } else {
            //     return this.match.insertOne(
            //         data as unknown as DataTypes[Tables.Match]
            //     );
            // }
            // case Tables.MatchGame:
            //     if (Array.isArray(data)) {
            //         return this.match.insertManySubdocs(
            //             table,
            //             data as unknown as DataTypes[Tables.MatchGame][]
            //         );
            //     } else {
            //         return this.match.insertOneSubdoc(
            //             table,
            //             data as unknown as DataTypes[Tables.MatchGame]
            //         );
            //     }

            default:
                return false;
        }
    }

    select<T extends keyof DataTypes>(table: T): Promise<DataTypes[T][] | null>;
    select<T extends keyof DataTypes>(
        table: T,
        id: Id
    ): Promise<DataTypes[T] | null>;
    select<T extends keyof DataTypes>(
        table: T,
        filter: Partial<DataTypes[T]>
    ): Promise<DataTypes[T][] | null>;
    async select<T extends keyof DataTypes>(
        table: T,
        filter?: Partial<DataTypes[T]> | Id
    ): Promise<DataTypes[T][] | DataTypes[T] | null> {
        switch (table) {
            case Tables.Match:
            case Tables.MatchGame:
            case Tables.Participant:
                return this[
                    table as
                        | Tables.Match
                        | Tables.MatchGame
                        | Tables.Participant
                ].select(filter) as Promise<
                    DataTypes[T][] | DataTypes[T] | null
                >;
            case Tables.Group:
            case Tables.Stage:
            case Tables.Round:
                return this.tournament.select(table, filter) as Promise<
                    DataTypes[T][] | DataTypes[T] | null
                >;
            // return this.match.select(filter) as Promise<
            //     DataTypes[T][] | DataTypes[T] | null
            // >;
            // return this.match.selectSubdocs(table, filter) as Promise<
            //     DataTypes[T][] | DataTypes[T] | null
            // >;
            default:
                return null;
        }
    }

    update<T extends keyof DataTypes>(
        table: T,
        id: Id,
        value: DataTypes[T]
    ): Promise<boolean>;
    update<T extends keyof DataTypes>(
        table: T,
        filter: Partial<DataTypes[T]>,
        value: Partial<DataTypes[T]>
    ): Promise<boolean>;
    async update<T extends keyof DataTypes>(
        table: T,
        filter: Partial<DataTypes[T]> | Id,
        data: Partial<DataTypes[T]> | DataTypes[T]
    ): Promise<boolean> {
        switch (table) {
            case Tables.Group:
            case Tables.Round:
            case Tables.Stage:
                return this.tournament.update(table, filter, data);
            case Tables.Match:
            case Tables.Participant:
            case Tables.MatchGame:
                return this[
                    table as
                        | Tables.Match
                        | Tables.Participant
                        | Tables.MatchGame
                ].update(filter, data);
            default:
                return false;
        }
    }

    delete<T extends keyof DataTypes>(table: T): Promise<boolean>;
    delete<T extends keyof DataTypes>(
        table: T,
        filter: Partial<DataTypes[T]>
    ): Promise<boolean>;
    async delete<T extends keyof DataTypes>(
        table: T,
        filter?: Partial<DataTypes[T]>
    ): Promise<boolean> {
        switch (table) {
            case Tables.Group:
            case Tables.Round:
            case Tables.Stage:
                return this.tournament.delete(table, filter);
            case Tables.Participant:
            case Tables.Match:
            case Tables.MatchGame:
                return this[
                    table as
                        | Tables.Participant
                        | Tables.Match
                        | Tables.MatchGame
                ].delete(filter);
            // if (!filter) {
            //     return Match.updateMany({}, { $set: { games: undefined } })
            //         .exec()
            //         .then(() => true)
            //         .catch((err) => {
            //             console.error(err);
            //             return false;
            //         });
            // }

            // return Match.updateMany(
            //     {},
            //     { $set: { "games.$[elem]": undefined } },
            //     {
            //         arrayFilters: [
            //             {
            //                 elem: {
            //                     filter,
            //                 },
            //             },
            //         ],
            //     }
            // )
            //     .exec()
            //     .then(() => true)
            //     .catch((err) => {
            //         console.error(err);
            //         return false;
            //     });

            default:
                return false;
        }
    }

    async reset(): Promise<boolean> {
        try {
            await mongoose.connection.dropDatabase();
            return true;
        } catch (err) {
            return false;
        }
    }
}
