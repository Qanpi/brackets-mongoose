import { DataTypes } from "brackets-manager";
import { Id } from "brackets-model";
import { ObjectId, isValidObjectId } from "mongoose";

// export type DataTypes[T extends keyof DataTypes] = DataTypes[T];

export type CustomId = ObjectId | Id;

export function isId<T extends keyof DataTypes>(id?: Partial<DataTypes[T]> | CustomId): id is CustomId {
    return typeof id === "number" || typeof id === "string" || isValidObjectId(id);
}

