import { DataTypes, OmitId } from "brackets-manager";
import { Document, FilterQuery, Model} from "mongoose";
import { isId, CustomId } from "./types";

export default class Participant<
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
    async insertOne(data: OmitId<DataTypes[T]>): Promise<CustomId> {
        const result = (await this.model.create(data)) as Document<CustomId>;
        return result._id || -1;
    }

    /**
     *
     * @param data
     */
    async insertMany(data: OmitId<DataTypes[T]>[]): Promise<boolean> {
        await this.model.insertMany(data);
        return true;
    }

    async select(
        filter?: Partial<DataTypes[T]> | CustomId
    ): Promise<DataTypes[T] | DataTypes[T][] | null> {
        if (!filter) {
            return (await this.model.find({}).exec()) as unknown as Promise<
                DataTypes[T][]
            >;
        } else if (isId(filter)) {
            //TODO: custom type predicate for Id
            return (await this.model
                .findById(filter)
                .exec()) as unknown as Promise<DataTypes[T]>;
        }

        const selected = await this.model
            .find(this.model.translateAliases(filter) as object)
            .exec();
        return selected as unknown as Promise<DataTypes[T][]>;
    }

    async update(
        filter: Partial<DataTypes[T]> | CustomId,
        data: Partial<DataTypes[T]> | DataTypes[T]
    ): Promise<boolean> {
        const d = this.model.translateAliases(data) as object;

        if (isId(filter)) {
            await this.model.findByIdAndUpdate(filter, d);
            return true;
        }

        const f = this.model.translateAliases(filter) as object;
        await this.model.updateMany(f, d);
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
            const f = this.model.translateAliases(filter) as FilterQuery<any>;

            await this.model.deleteMany({
                ...f,
            });
        }
        return true;
    }
}
