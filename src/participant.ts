import { OmitId } from "brackets-manager";
import { Id } from "brackets-model";
import { Document, FilterQuery, Model, ObjectId } from "mongoose";
import { TData } from "./types";

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
    async insertOne(data: OmitId<TData<"participant">>): Promise<Id> {
        try {
            const result = (await this.model.create(
                data,
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
    async insertMany(data: OmitId<TData<"participant">>[]): Promise<boolean> {
        try {
            await this.model.insertMany(data);
            return true;
        } catch (err) {
            console.error(err);
            return false;
        }
    }

    /**
     *
     * @param filter
     */
    async delete(filter?: Partial<TData<"participant">>): Promise<boolean> {
        try {
            if (!filter) await this.model.deleteMany({});
            if (filter?.id) await this.model.findByIdAndDelete(filter.id);
            else {
                const f = this.model.translateAliases(
                    filter,
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
