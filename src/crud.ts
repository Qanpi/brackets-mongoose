import { DataTypes, OmitId } from "brackets-manager";
import { Document, FilterQuery, Model } from "mongoose";
import { isId } from "./types";
import { Id } from "brackets-model";

export default class MongooseCRUD<
    M extends Model<any>,
    T extends keyof DataTypes
> {
    protected model: M;

    /**
     *
     * @param model
     */
    constructor(model: M) {
        this.model = model;
    }

    /**
     *
     * @param data
     */
    async insert(
        data: OmitId<DataTypes[T]> | OmitId<DataTypes[T]>[]
    ): Promise<Id | boolean> {
        if (Array.isArray(data)) {
            await this.model.create(data, { ordered: true }); //not using createMany because pre-save middleware wouldn't execute
            return true;
        } else {
            const result = (await this.model.create(data)) as Document<Id>;
            return result.id === 0 ? 0 : (result.id as Id) || -1;
        }
    }

    async select(
        filter?: Partial<DataTypes[T]> | Id
    ): Promise<DataTypes[T] | DataTypes[T][] | null> {
        if (typeof filter === "object") {
            const selected = await this.model
                .find(filter)
                .lean({ virtuals: true, getters: true })
                .exec();
            return selected as unknown as Promise<DataTypes[T][]>;
        }

        if (isId(filter)) {
            //TODO: custom type predicate for Id
            return (await this.model
                .findOne({ id: filter })
                .lean({ virtuals: true, getters: true })
                .exec()) as unknown as Promise<DataTypes[T]>;
        }

        return (await this.model
            .find({})
            .lean({ virtuals: true, getters: true })
            .exec()) as unknown as Promise<DataTypes[T][]>;
    }

    async update(
        filter: Partial<DataTypes[T]> | Id,
        data: Partial<DataTypes[T]> | DataTypes[T]
    ): Promise<boolean> {
        if (typeof filter === "object") {
            await this.model.updateMany(filter, data);
            return true;
        }

        if (isId(filter)) {
            await this.model.findOneAndUpdate({ id: filter }, data);
            return true;
        }

        return false;
    }
    /**
     *
     * @param filter
     */
    async delete(filter?: Partial<DataTypes[T]>): Promise<boolean> {
        // if (!filter && filter !== 0) await this.model.deleteMany({});
        // if (filter?.id) await this.model.findOneAndDelete({ id: filter });
        await this.model.deleteMany(filter);

        return true;
    }
}
