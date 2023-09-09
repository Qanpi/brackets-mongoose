import { DataTypes, OmitId } from "brackets-manager";
import { Document, FilterQuery, Model} from "mongoose";
import { isId} from "./types";
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
    async insertOne(data: OmitId<DataTypes[T]>): Promise<Id> {
        const result = (await this.model.create(data)) as Document<Id>;
        return result.id as Id || -1;
    }

    /**
     *
     * @param data
     */
    async insertMany(data: OmitId<DataTypes[T]>[]): Promise<boolean> {
        await this.model.create(data, {ordered: true}); //not using createMany because pre-save middleware wouldn't execute
        return true;
    }

    async select(
        filter?: Partial<DataTypes[T]> | Id
    ): Promise<DataTypes[T] | DataTypes[T][] | null> {
        if (!filter) {
            return (await this.model.find({}).lean({virtuals: true}).exec()) as unknown as Promise<
                DataTypes[T][]
            >;
        } else if (isId(filter)) {
            //TODO: custom type predicate for Id
            return (await this.model
                .findById(filter)
                .lean({virtuals: true, getters: true})
                .exec()) as unknown as Promise<DataTypes[T]>;
        }

        const selected = await this.model
            .find(filter)
            .lean({virtuals: true, getters: true})
            .exec();
        return selected as unknown as Promise<DataTypes[T][]>;
    }

    async update(
        filter: Partial<DataTypes[T]> | Id,
        data: Partial<DataTypes[T]> | DataTypes[T]
    ): Promise<boolean> {
        if (isId(filter)) {
            await this.model.findByIdAndUpdate(filter, data);
            return true;
        }

        await this.model.updateMany(filter, data);
        return true;
    }
    /**
     *
     * @param filter
     */
    async delete(filter?: Partial<DataTypes[T]>): Promise<boolean> {
        if (!filter) await this.model.deleteMany({});
        if (filter?.id) await this.model.findByIdAndDelete(filter.id);
        else {
            await this.model.deleteMany(filter);
        }
        return true;
    }
}
