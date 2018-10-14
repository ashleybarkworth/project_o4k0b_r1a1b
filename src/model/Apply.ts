import {IDataSetEntry} from "./IFullDataset";
import {Decimal} from "decimal.js";

export abstract class Apply {

    private name: string;
    private field: string;
    private func: (lst: any[]) => number;

    constructor(name: string, field: string, func: (lst: any[]) => number) {
        this.name = name;
        this.field = field;
        this.func = func;
    }

    public getName(): string {
        return this.name;
    }

    /**
     * An apply is a function that is applied to a group of dataset entries and produces a number.
     * @param group the dataset entries to consider. Cannot be empty.
     */
    public apply(group: IDataSetEntry[]): number {
        return this.func(group.map((dataset) => dataset[this.field]));
    }
}

export abstract class SimpleApply extends Apply {
    constructor(name: string, field: string, func: (a: any, b: any) => number) {
        super(name, field, (lst) => lst.reduce(func));
    }
}

/**
 * Gets the maximum value of a numeric field
 */
export class Max extends SimpleApply {
    constructor(name: string, field: string) {
        super(name, field, (val: number, res: number) => Math.max(val, res));
    }
}

/**
 * Gets the minimum value of a numeric field
 */
export class Min extends SimpleApply {
    constructor(name: string, field: string) {
        super(name, field, (val: number, res: number) => Math.min(val, res));
    }
}

/**
 * Gets the sum of all values of a numeric field
 */
export class Sum extends SimpleApply {
    constructor(name: string, field: string) {
        super(name, field, (val: number, res: number) => val + res);
    }
}

/**
 * Counts the number of unique values of a field
 */
export class Count extends Apply {
    constructor(name: string, field: string) {
        super(name, field, (lst) => {
            return new Set(lst).size;
        });
    }
}

/**
 * Gets the average of all values of a numeric field
 */
export class Average extends Apply {
    constructor(name: string, field: string) {
        super(name, field, (lst) => {
            let sum: Decimal = lst.reduce((val: number, res: Decimal) => new Decimal(val).add(res), new Decimal(0));
            return Number((sum.toNumber() / lst.length).toFixed(2));
        });
    }
}
