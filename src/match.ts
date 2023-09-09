import { DataTypes } from "brackets-manager";
import {
    Document,
    HydratedDocument,
    Model,
    SchemaTypes,
    Types,
} from "mongoose";
import MongooseCRUD from "./crud";
import { isId } from "./types";
import { Id } from "brackets-model";
import { isMatch } from "lodash";

export enum MatchSubPaths {
    match_game = "games",
}

export type TMatchTables = keyof typeof MatchSubPaths;

export type TMatchDocument = HydratedDocument<Document<Id>> & {
    [K in keyof Record<MatchSubPaths, string>]: Types.DocumentArray<
        Types.ArraySubdocument<Id>
    >;
};

export default class Match extends MongooseCRUD<Model<any>, "match"> {
    constructor(model: Model<any>) {
        super(model);
    }

    async insertManySubdocs(
        table: TMatchTables,
        data: DataTypes[TMatchTables][]
    ): Promise<Id | boolean> {
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
        data: DataTypes[TMatchTables]
    ): Promise<Id> {
        const path = MatchSubPaths[table];

        const match = (await this.model.findById(
            data.parent_id
        )) as TMatchDocument;

        const game = match.games.create(data);
        match[path].push(game);

        await match.save();
        return game._id?.toString() || -1;
    }

    async update(
        filter: Id | Partial<DataTypes["match"]>,
        data: DataTypes["match"] | Partial<DataTypes["match"]>
    ): Promise<boolean> {
        // if ("_doc" in data && "games" in data._doc) delete data["games"]; //ugly fix to prevent updates from modifying the value of nested subdoc array
        if ("games" in data) delete data["games"];
        return await super.update(filter, data);
    }

    async selectSubdocs(
        table: TMatchTables,
        filter?: Partial<DataTypes[TMatchTables]> | Id
    ): Promise<DataTypes[TMatchTables] | DataTypes[TMatchTables][] | null> {
        if (!filter) {
            const games = (await this.model
                .aggregate([
                    {
                        $unwind: "$games",
                    },
                    {
                        $replaceRoot: {
                            newRoot: "$games",
                        },
                    },
                    // {
                    //     $match: filter ? filter : {},
                    // },
                ])
                .exec()) as unknown as DataTypes[TMatchTables][];
            return games;
        } else if (isId(filter)) {
            const match = (await this.model.findOne({
                "games.id": filter,
            })) as TMatchDocument;
            return match?.games.id(filter) as unknown as Promise<
                DataTypes[TMatchTables]
            >;
        } else if (filter?.parent_id) {
            const match = (await this.model.findById(
                filter.parent_id
            )) as TMatchDocument;
            return match.games.toObject() as unknown as DataTypes[TMatchTables];
        }

        return null;
    }

    async updateSubdocs(
        table: TMatchTables,
        filter: Partial<DataTypes[TMatchTables]> | Id,
        data: Partial<DataTypes[TMatchTables]> | DataTypes["match"]
    ): Promise<boolean> {
        return false;
    }

    async deleteSubdocs(
        table: TMatchTables,
        filter?: Partial<DataTypes[TMatchTables]>
    ): Promise<boolean> {
        const path = MatchSubPaths[table];

        if (filter) {
            const { parent_id, ...query } = filter;
            const match = (await this.model.findById(
                parent_id
            )) as TMatchDocument;

            const toDelete = match[path].filter(
                (d) => !isMatch(d, query)
            ) as Types.DocumentArray<Types.ArraySubdocument<Id>>;

            match[path] = match[path].pull(...toDelete);

            await match.save();
            return true;
        }
        return false;
    }
}
