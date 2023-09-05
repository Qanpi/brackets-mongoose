import { OmitId, DataTypes } from "brackets-manager";
import { Id } from "brackets-model";
import { Document, FilterQuery, Model, ObjectId } from "mongoose";
import { TData, isId } from "./types";

export default class Participant<M extends Model<any>> {
    private model: M;

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
    async insertOne(data: OmitId<DataTypes["participant"]>): Promise<Id> {
        try {
            const result = (await this.model.create(
                data
            )) as Document<ObjectId>;
            return result._id?.toString() || -1;
        } catch (err) {
            console.error(err);
            return -1;
        }
    }

    /**
     *
     * @param data
     */
    async insertMany(
        data: OmitId<DataTypes["participant"]>[]
    ): Promise<boolean> {
        try {
            await this.model.insertMany(data);
            return true;
        } catch (err) {
            console.error(err);
            return false;
        }
    }

    async select(
        filter?: Partial<DataTypes["participant"]> | Id
    ): Promise<DataTypes["participant"] | DataTypes["participant"][] | null> {
        if (!filter) {
            return this.model.find({}).exec() as unknown as Promise<
                DataTypes["participant"][]
            >;
        } else if (typeof filter === "string") {
            //TODO: custom type predicate for Id
            return this.model.findById(filter).exec() as unknown as Promise<
                DataTypes["participant"]
            >;
        }

        return (await this.model
            .find(this.model.translateAliases(filter) as object)
            .exec()) as unknown as Promise<DataTypes["participant"][]>;
    }

    async update(
        filter: Partial<DataTypes["participant"]> | Id,
        data: Partial<DataTypes["participant"]> | DataTypes["participant"]
    ): Promise<boolean> {
        const d = this.model.translateAliases(data) as object;

        if (isId(filter)) {
            await this.model.findByIdAndUpdate(filter, d);
            return true;
        }

        const f = this.model.translateAliases(filter) as object;
        return this.model.updateMany(f, d)
            .exec()
            .then(() => true)
            .catch((err) => {
                console.error(err);
                return false;
            });
    }
    /**
     *
     * @param filter
     */
    async delete(filter?: Partial<DataTypes["participant"]>): Promise<boolean> {
        try {
            if (!filter) await this.model.deleteMany({});
            if (filter?.id) await this.model.findByIdAndDelete(filter.id);
            else {
                const f = this.model.translateAliases(
                    filter
                ) as FilterQuery<any>;

                await this.model.deleteMany({
                    ...f,
                });
            }
            return true;
        } catch (err) {
            console.error(err);
            return false;
        }
    }
}
