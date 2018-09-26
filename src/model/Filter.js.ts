import {ICourseSection} from "./IFullDataset";

export interface IFilter {
    validCourseSection(courseSection: ICourseSection): boolean;
}

export class Negation implements IFilter {
    private innerFilter: IFilter;

    constructor(filter: IFilter) {
        this.innerFilter = filter;
    }

    public validCourseSection(courseSection: ICourseSection): boolean {
        return !this.innerFilter.validCourseSection(courseSection);
    }
}

export class SComparison implements IFilter {
    private key: string;
    private searchText: string;

    constructor(key: string, searchText: string) {
        this.key = key;
        this.searchText = searchText;
    }

    public validCourseSection(courseSection: ICourseSection): boolean {
        // TODO
        return true;
    }
}

export class MComparator implements IFilter {
    private key: string;
    private comparison: (value: number) => boolean;

    constructor(key: string, comparison: (value: number) => boolean) {
        this.key = key;
        this.comparison = comparison;
    }

    public validCourseSection(courseSection: ICourseSection): boolean {
        // TODO replace zero with value of key field
        return this.comparison(50);
    }
}

export class GtComparator extends MComparator {
    constructor(key: string, numberToCompare: number) {
        super(key, (value: number) => value > numberToCompare);
    }
}

export class LtComparator extends MComparator {
    constructor(key: string, numberToCompare: number) {
        super(key, (value: number) => value < numberToCompare);
    }
}

export class EqComparator extends MComparator {
    constructor(key: string, numberToCompare: number) {
        super(key, (value: number) => value === numberToCompare);
    }
}

export class LogicComparison implements IFilter {
    private innerFilters: IFilter[];
    private boolCombine: (a: boolean, b: boolean) => boolean;

    constructor(innerFilters: IFilter[], boolCombine: (a: boolean, b: boolean) => boolean) {
        this.innerFilters = innerFilters;
        this.boolCombine = boolCombine;
    }

    public validCourseSection(courseSection: ICourseSection): boolean {
        return this.innerFilters
            .map((filter) => filter.validCourseSection(courseSection))
            .reduce(this.boolCombine, true);
    }
}

export class AndComparison extends LogicComparison {
    constructor(innerFilters: IFilter[]) {
        super(innerFilters, (a: boolean, b: boolean) => a && b);
    }
}

export class OrComparison extends LogicComparison {
    constructor(innerFilters: IFilter[]) {
        super(innerFilters, (a: boolean, b: boolean) => a || b);
    }
}
