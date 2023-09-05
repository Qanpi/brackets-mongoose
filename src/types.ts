import { DataTypes } from "brackets-manager";
import { Id } from "brackets-model";

// export type DataTypes[T extends keyof DataTypes] = DataTypes[T];

export function isId<T extends keyof DataTypes>(id: Partial<DataTypes[T]> | Id): id is Id {
    return typeof id === "string" || typeof id === "number";
}

