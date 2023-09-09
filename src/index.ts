import { CrudInterface, DataTypes, OmitId } from "brackets-manager";
import mongoose, { Model, Mongoose } from "mongoose";
import Participant from "./participant";
import Tournament, { TTournamentModel } from "./tournament";
import Match from "./match";
import { Id } from "brackets-model";

enum Tables {
    Participant = "participant",
    Stage = "stage",
    Group = "group",
    Round = "round",
    Match = "match",
    MatchGame = "match_game",
}

export default class MongooseForBrackets implements CrudInterface {
    private tournament: Tournament<TTournamentModel>;
    private participant: Participant;
    private match: Match;

    constructor(mongoose: Mongoose) {
        //FIXME: don't rely on magic strings
        this.tournament = new Tournament(
            mongoose.model("Tournament") as TTournamentModel
        );
        this.participant = new Participant(mongoose.model("Participant"));
        this.match = new Match(mongoose.model("Match"));
    }

    insert<T extends keyof DataTypes>(
        table: T,
        value: OmitId<DataTypes[T]>
    ): Promise<number>;
    insert<T extends keyof DataTypes>(
        table: T,
        values: OmitId<DataTypes[T]>[]
    ): Promise<boolean>;
    async insert<T extends keyof DataTypes>(
        table: T,
        data: OmitId<DataTypes[T]> | OmitId<DataTypes[T]>[]
    ): Promise<Id | boolean> {
        switch (table) {
            case Tables.Participant:
                if (Array.isArray(data)) {
                    return this.participant.insertMany(
                        data as unknown as DataTypes[Tables.Participant][]
                    );
                } else {
                    return this.participant.insertOne(
                        data as unknown as DataTypes[Tables.Participant]
                    );
                }
            case Tables.Stage:
            case Tables.Group:
            case Tables.Round:
                if (Array.isArray(data)) {
                    return this.tournament.insertMany(
                        table,
                        data as unknown as DataTypes[
                            | Tables.Stage
                            | Tables.Group
                            | Tables.Round][]
                    );
                } else {
                    return this.tournament.insertOne(
                        table,
                        data as unknown as DataTypes[
                            | Tables.Stage
                            | Tables.Group
                            | Tables.Round]
                    );
                }
            case Tables.Match:
                if (Array.isArray(data)) {
                    return this.match.insertMany(
                        data as unknown as DataTypes[Tables.Match][]
                    );
                } else {
                    return this.match.insertOne(
                        data as unknown as DataTypes[Tables.Match]
                    );
                }
            case Tables.MatchGame:
                if (Array.isArray(data)) {
                    return this.match.insertManySubdocs(
                        table,
                        data as unknown as DataTypes[Tables.MatchGame][]
                    );
                } else {
                    return this.match.insertOneSubdoc(
                        table,
                        data as unknown as DataTypes[Tables.MatchGame]
                    );
                }

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
            case Tables.Participant:
                return this.participant.select(filter) as Promise<
                    DataTypes[T][] | DataTypes[T] | null
                >;
            case Tables.Group:
            case Tables.Round:
            case Tables.Stage:
                return this.tournament.select(table, filter) as Promise<
                    DataTypes[T][] | DataTypes[T] | null
                >;
            case Tables.Match:
                return this.match.select(filter) as Promise<
                    DataTypes[T][] | DataTypes[T] | null
                >;
            case Tables.MatchGame:
                return this.match.selectSubdocs(table, filter) as Promise<
                    DataTypes[T][] | DataTypes[T] | null
                >;
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
            case Tables.Participant:
                return this.participant.update(filter, data);
            case Tables.Group:
            case Tables.Round:
            case Tables.Stage:
                return this.tournament.update(table, filter, data);
            case Tables.Match:
                return this.match.update(filter, data);
            case Tables.MatchGame:
                return this.match.updateSubdocs(table, filter, data);
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
            case Tables.Participant:
                return this.participant.delete(filter);
            case Tables.Group:
            case Tables.Round:
            case Tables.Stage:
                return this.tournament.delete(table, filter);
            case Tables.Match:
                return this.match.delete(filter);
            case Tables.MatchGame:
                return this.match.deleteSubdocs(table, filter);
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
        await mongoose.model("Tournament").collection.drop();
        await mongoose.model("Participant").collection.drop();
        await mongoose.model("Match").collection.drop();
        return true;
    }
}
