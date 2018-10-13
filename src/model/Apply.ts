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
     * TODO make this a good comment
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

export class Max extends SimpleApply {
    constructor(name: string, field: string) {
        super(name, field, (val: number, res: number) => Math.max(val, res));
    }
}

export class Min extends SimpleApply {
    constructor(name: string, field: string) {
        super(name, field, (val: number, res: number) => Math.min(val, res));
    }
}

export class Sum extends SimpleApply {
    constructor(name: string, field: string) {
        super(name, field, (val: number, res: number) => val + res);
    }
}

export class Count extends Apply {
    // TODO
    constructor(name: string, field: string) {
        super(name, field, undefined);
    }
}

export class Average extends Apply {
    constructor(name: string, field: string) {
        super(name, field, (lst) => {
            let sum: Decimal = lst.reduce((val: number, res: Decimal) => {
                return new Decimal(val).add(res);
            });
            return Number((sum.toNumber() / lst.length).toFixed(2));
        });
    }
}
