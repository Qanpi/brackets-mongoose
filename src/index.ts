import { CrudInterface, DataTypes, OmitId } from "brackets-manager";
import { Id } from "brackets-model";
import { Model, Mongoose } from "mongoose";
import { handleDelete } from "./delete";
import { handleInsert } from "./insert";
import { handleSelect } from "./select";
import { handleUpdate } from "./update";
import Participant from "./participant";
import Tournament from "./tournament";
import {
    TData,
    TData<Tables.Group>,
    TMatchData,
    TData<Tables.Participant>,
    TData<Tables.Round>,
    TStageData,
    TTournamentModel,
    TTournamentSubPaths,
import { TTournamentSubData } from "./types";
} from "./types";

enum Tables {
    Participant = "participant",
    Stage = "stage",
    Group = "group",
    Round = "round",
    Match = "match",
    MatchGame = "match_game",
}

export default class MongooseForBrackets<
    TournamentModel extends TTournamentModel,
    ParticipantModel extends Model<any>,
    MatchModel extends Model<any>
> implements CrudInterface
{
    private tournament: Tournament<TournamentModel>;
    private participant: Participant<ParticipantModel>;
    private match: Participant<MatchModel>;

    constructor(
        tournamentModel: TournamentModel,
        participantModel: ParticipantModel,
        matchModel: MatchModel,
    ) {
        this.tournament = new Tournament(tournamentModel);
        this.participant = new Participant(participantModel);
        this.match = new Participant(matchModel);
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
        data: OmitId<DataTypes[T]> | OmitId<DataTypes[T]>[],
    ): Promise<Id | boolean> {
        switch (table) {
            case Tables.Participant:
                if (Array.isArray(data)) {
                    return this.participant.insertMany(
                        data as unknown as TData<Tables.Participant>[],
                    );
                } else {
                    return this.participant.insertOne(
                        data as unknown as TData<Tables.Participant>,
                    );
                }
            case Tables.Stage:
            case Tables.Group:
            case Tables.Round:
                if (Array.isArray(data)) {
                    return this.tournament.insertMany(
                        table,
                        data as unknown as TTournamentSubData[] 
                    );
                } else {
                    return this.tournament.insertOne(
                        table,
                        data as unknown as TTournamentSubData,
                    );
                }
            case Tables.Match:
                if (Array.isArray(data)) {
                    return this.match.insertMany(
                        data as unknown as TData<Tables.Match>[],
                    );
                } else {
                    return this.match.insertOne(
                        data as unknown as TData<Tables.Match>,
                    );
                }
            case Tables.MatchGame:

                const matchGameData = data as
                    | OmitId<DataTypes["match_game"]>
                    | OmitId<DataTypes["match_game"]>[];

                if (Array.isArray(data)) {
                    this.match.insertMany
                    const promises = [];


                    return Promise.all(promises)
                        .then(() => true)
                        .catch((err) => {
                            console.error(err);
                            return false;
                        });
                } else {
                    const match = await this.match.findById(
                        matchGameData.parent_id,
                    );

                    const matchGame = match!.games.create(matchGameData);
                    match!.games.push(matchGame);
                    return match!
                        .save()
                        .then(() => matchGame.id)
                        .catch((err) => {
                            console.error(err);
                            return -1;
                        });
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
        filter?: Partial<DataTypes[T]> | Id,
    ): Promise<DataTypes[T][] | DataTypes[T] | null> {
        return handleSelect(this.client, table, filter);
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
        data: Partial<DataTypes[T]> | DataTypes[T],
    ): Promise<boolean> {
        return handleUpdate(this.client, table, filter, data);
    }

    delete<T extends keyof DataTypes>(table: T): Promise<boolean>;
    delete<T extends keyof DataTypes>(
        table: T,
        filter: Partial<DataTypes[T]>
    ): Promise<boolean>;
    async delete<T extends keyof DataTypes>(
        table: T,
        filter?: Partial<DataTypes[T]>,
    ): Promise<boolean> {
        switch (table) {
            case "participant":
                return this.participant.delete(filter);
            case "group":
                return this.tournament.delete("groups", filter);
            case "stage":
                return this.tournament.delete("stages", filter);
            case "round":
                return this.tournament.delete("rounds", filter);
            case "match":
                const Match = mongoose.model("Match");
                if (!filter) {
                    return Match.deleteMany({})
                        .then(() => true)
                        .catch((err) => {
                            console.error(err);
                            return false;
                        });
                }
                return Match.deleteMany({
                    ...Match.translateAliases(filter),
                    _id: filter.id,
                    id: undefined,
                })
                    .then(() => true)
                    .catch((err) => {
                        console.error(err);
                        return false;
                    });
            case "match_game":
                if (!filter) {
                    return Match.updateMany({}, { $set: { games: undefined } })
                        .exec()
                        .then(() => true)
                        .catch((err) => {
                            console.error(err);
                            return false;
                        });
                }

                return Match.updateMany(
                    {},
                    { $set: { "games.$[elem]": undefined } },
                    {
                        arrayFilters: [
                            {
                                elem: {
                                    filter,
                                },
                            },
                        ],
                    },
                )
                    .exec()
                    .then(() => true)
                    .catch((err) => {
                        console.error(err);
                        return false;
                    });

            default:
                return false;
        }
    }
}
