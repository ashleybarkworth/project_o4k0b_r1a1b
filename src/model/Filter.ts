import {ICourseSection} from "./IFullDataset";

/**
 * Each query contains a single filter which determines which course sections to include in the results.
 */
export interface IFilter {
    /**
     * Determine, based on the body of the filter and the arguments passed to it, whether or not a course section
     * should be included in the query results.
     *
     * @param courseSection the course section to validate; cannot be null or undefined.
     * @returns true if the course section is valid, false otherwise
     */
    validCourseSection(courseSection: ICourseSection): boolean;
}

/**
 * Special case for an empty WHERE block
 */
export class EmptyFilter implements IFilter {
    public validCourseSection(courseSection: ICourseSection): boolean {
        return true;
    }
}

/**
 * An implementation of the IFilter interface corresponding to the NOT filter.
 */
export class Negation implements IFilter {
    private innerFilter: IFilter;

    constructor(filter: IFilter) {
        this.innerFilter = filter;
    }

    public validCourseSection(courseSection: ICourseSection): boolean {
        return !this.innerFilter.validCourseSection(courseSection); // Negate the result of the inner filter
    }
}

/**
 * An implementation of the IFilter interface corresponding to the IS filter.
 */
export class SComparison implements IFilter {
    /**
     * The key to search; must be one of the valid keys defined in FilterDeserializer, e.g. "dept", "instructor".
     * Must be a string and must correspond to a string value within the CourseSection object.
     */
    private key: string;

    /**
     * The text we are attempting to match. Must be in the format `[*]? [^*]* [*]?` where the asterisk character
     * acts as a wildcard and means "zero or more of any character, except the asterisk".
     */
    private searchText: string;

    constructor(key: string, searchText: string) {
        this.key = key;
        this.searchText = searchText;
    }

    /**
     * @inheritDoc
     * Return true if the value of the property with key this.key matches this.searchText.
     */
    public validCourseSection(courseSection: ICourseSection): boolean {
        let val = courseSection[this.key];
        let hasStartAsterisk: boolean = this.searchText.startsWith("*");
        let hasEndAsterisk: boolean = this.searchText.endsWith("*");

        // Remove the asterisks from the search text
        let text: string = this.searchText.replace(new RegExp("\\*", "g"), "");
        if (!hasStartAsterisk && !hasEndAsterisk) {
            return text === val;          // If there are no wildcards, we need an exact match
        } else if (!hasEndAsterisk) {
            return val.endsWith(text);    // Wilcard at the beginning, so match the end of the text
        } else if (!hasStartAsterisk) {
            return val.startsWith(text);  // Wildcard at the end, so match the beginning of the text
        } else {
            return val.includes(text);    // Wildcards on both sides, text just needs to appear somewhere
        }
    }
}

/**
 * An abstract class implementing IFilter which corresponds to the MComparator filters (LG, GT, EQ)
 */
export abstract class MComparator implements IFilter {
    /**
     * The key to compare; must be one of the valid keys defined in FilterDeserializer, e.g. "avg", "pass".
     * Must be a string and must correspond to a number value within the CourseSection object.
     */
    private key: string;

    /**
     * A function which takes in the value of the property corresponding to this.key and returns a boolean. Set by
     * the subclass.
     *
     * e.g. a { "LT" : 90 } filter would have a comparison function which returns true when {value} is less than 90.
     */
    private comparison: (value: number) => boolean;

    constructor(key: string, comparison: (value: number) => boolean) {
        this.key = key;
        this.comparison = comparison;
    }

    public validCourseSection(courseSection: ICourseSection): boolean {
        let val = courseSection[this.key];
        let valAsNum = val as number;
        return this.comparison(valAsNum); // Comes from subclass
    }
}

/**
 * An implementation of IFilter and subclass of MComparator corresponding to the GT filter.
 */
export class GtComparator extends MComparator {
    constructor(key: string, numberToCompare: number) {
        super(key, (value: number) => value > numberToCompare);
    }
}

/**
 * An implementation of IFilter and subclass of MComparator corresponding to the LT filter.
 */
export class LtComparator extends MComparator {
    constructor(key: string, numberToCompare: number) {
        super(key, (value: number) => value < numberToCompare);
    }
}

/**
 * An implementation of IFilter and subclass of MComparator corresponding to the EQ filter.
 */
export class EqComparator extends MComparator {
    constructor(key: string, numberToCompare: number) {
        super(key, (value: number) => value === numberToCompare);
    }
}

/**
 * An abstract class implementing IFilter which corresponds to the Logic Comparison filters (AND, OR)
 */
export abstract class LogicComparison implements IFilter {
    private innerFilters: IFilter[];
    /**
     * A function which takes in the results of calling validCourseSection on each of the inner functions, and
     * returns the result of the logic comparison. Set by the subclass.
     */
    private boolCombine: (a: boolean, b: boolean) => boolean;

    constructor(innerFilters: IFilter[], boolCombine: (a: boolean, b: boolean) => boolean) {
        this.innerFilters = innerFilters;
        this.boolCombine = boolCombine;
    }

    public validCourseSection(courseSection: ICourseSection): boolean {
        return this.innerFilters
            .map((filter) => filter.validCourseSection(courseSection))
            .reduce(this.boolCombine);
    }
}

/**
 * An implementation of IFilter and subclass of LogicComparison corresponding to the AND filter.
 */
export class AndComparison extends LogicComparison {
    constructor(innerFilters: IFilter[]) {
        super(innerFilters, (a: boolean, b: boolean) => a && b); // If one of the inner filters is false, return false
    }
}

/**
 * An implementation of IFilter and subclass of LogicComparison corresponding to the OR filter.
 */
export class OrComparison extends LogicComparison {
    constructor(innerFilters: IFilter[]) {
        super(innerFilters, (a: boolean, b: boolean) => a || b); // If one of the inner filters is true, return true
    }
}
