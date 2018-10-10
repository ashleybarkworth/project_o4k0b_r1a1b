import {ICourseSection} from "./IFullDataset";

export abstract class IApply {
    private field: string;
    private func: (val: any, res: any) => number;

    public apply(group: ICourseSection[]): number {
        return group.map((dataset) => dataset[this.field]).reduce(this.func);
    }
}


