import {
    AndComparison,
    EqComparator,
    GtComparator,
    IFilter,
    LogicComparison,
    LtComparator,
    MComparator,
    Negation,
    OrComparison,
    SComparison
} from "../model/Filter";
import {InsightError} from "../controller/IInsightFacade";
import Log from "../Util";
import {InsightDatasetKind, InsightError} from "../controller/IInsightFacade";
import {DeserializingUtils} from "./DeserializingUtils";

export class FilterDeserializer {
    private filters: string[] = ["AND", "OR", "LT", "GT", "EQ", "IS", "NOT"];

    private datasetKey: string;

    constructor(datsetKey: string) {
        this.datasetKey = datsetKey;
    }

    /**
     * Transforms a raw object read from json into an instance of IFilter
     * @param filter an object to deserialize
     * @throws InsightError if the object doesn't correspond to a valid instance of IFilter
     * @return the IFilter object
     */
    public deserialize(filter: any, datasetKind: InsightDatasetKind): IFilter {
        if (filter == null || filter === undefined || Array.isArray(filter)) {
            throw new InsightError("Malformed filter!");
        }
        let keys: string[] = Object.keys(filter);
        if (keys.length === 0) {
            return new EmptyFilter();
        }
        // The filter should contain one top-level key, e.g. "LT" or "AND" or "EQ"
        if (keys.length > 1 || !this.filters.includes(keys[0])) {
            throw new InsightError("Invalid filter");
        }
        let key = keys[0];
        switch (key) {
            case "AND":
            case "OR":
                return this.deserializeLogicComparison(filter[key], key, datasetKind);
            case "LT":
            case "GT":
            case "EQ":
                return this.deserializeMComparator(filter[key], key, datasetKind);
            case "IS":
                return this.deserializeSComparison(filter[key], datasetKind);
            case "NOT":
                return this.deserializeNegation(filter[key], datasetKind);
        }
    }

    private deserializeNoEmpty(filter: any): IFilter {
        if (filter == null || filter === undefined || Array.isArray(filter)) {
            throw new InsightError("Malformed filter!");
        }
        let keys: string[] = Object.keys(filter);
        if (keys.length === 0) {
            throw new InsightError("Filter is empty!");
        }
        return this.deserialize(filter);
    }

    /*
    A LogicComparison contains nothing but an array of inner filters
     */
    private deserializeLogicComparison(filterBody: any, kind: string, datasetKind: InsightDatasetKind): LogicComparison {
        // Must be an array, and must have at least one value
        if (!Array.isArray(filterBody || filterBody.length < 1)) {
            throw new InsightError("Passed a non-array value or an empty array into a logic comparison");
        }
        // Deserialize each of the inner filters
        let innerFilters: IFilter[] = filterBody.map((filter: any) => this.deserialize(filter, datasetKind));
        return kind === "AND" ? new AndComparison(innerFilters) : new OrComparison(innerFilters);
    }

    /*
    An MComparator contains a key/value pair.
    -   The key is in the form id_key, where id is the courses id, and key must correspond to a valid
        ICourseSection property with a numeric value.
    -   The value is a number that will be compared against the course section property corresponding to the key.
     */
    private deserializeMComparator(filterBody: any, kind: string, datasetKind: InsightDatasetKind): MComparator {
        let keys: string[] = Object.keys(filterBody);
        // Should contain exactly one top-level key/value pair.
        if (keys.length === 0 || keys.length > 1) {
            throw new InsightError("Invalid filter");
        }
        let keyAndId = keys[0];                 // In the form id_key
        let val: any = filterBody[keyAndId];    // Get the value from the key/value pair
        let key = DeserializingUtils.getKey(keyAndId, this.datasetKey, datasetKind); // Extract the key from id_key

        // Check the key corresponds to an ICourseSection property with a numeric value
        if (datasetKind === InsightDatasetKind.Courses && !DeserializingUtils.validCourseNumberTypeKeys.includes(key)) {
            throw new InsightError("Passed non-numeric column key to MComparator");
        }
        if (datasetKind === InsightDatasetKind.Rooms && !DeserializingUtils.validRoomNumberTypeKeys.includes(key)) {
            throw new InsightError("Passed non-numeric column key to MComparator");
        }

        // Check we are comparing against a numeric value
        if (typeof(val) !== "number") {
            throw new InsightError("Attempted to pass a non-number value into MComparator");
        }
        switch (kind) {
            case "LT":
                return new LtComparator(key, val);
            case "EQ":
                return new EqComparator(key, val);
            case "GT":
                return new GtComparator(key, val);
        }
    }

    /*
    A Negation contains a single internal filter.
     */
    private deserializeNegation(filterBody: any, datasetKind: InsightDatasetKind) {
        let innerFilter: IFilter = this.deserializeNoEmpty(filterBody, datasetKind);
        return new Negation(innerFilter);
    }

    /*
    An SComparison (IS) contains a key/value pair.
    -   The key is in the form id_key, where id is the courses id, and key must correspond to a valid
        ICourseSection property with a string value.
    -   The value is a string of the form `[*]? [^*]* [*]?`.
     */
    private deserializeSComparison(filterBody: any, datasetKind: InsightDatasetKind) {
        let keys: string[] = Object.keys(filterBody);
        // Should contain exactly one top-level key/value pair.
        if (keys.length === 0 || keys.length > 1) {
            throw new InsightError("Invalid filter");
        }
        let keyAndId = keys[0];                          // In the form id_key
        let searchString: any = filterBody[keyAndId];    // Get the value from the key/value pair
        let key = DeserializingUtils.getKey(keyAndId, this.datasetKey, datasetKind);   // Extract the key from id_key

        if (typeof searchString !== "string") {
            throw new InsightError("Tried to pass a non-string value into scomparison");
        }

        if (datasetKind === InsightDatasetKind.Courses && !DeserializingUtils.validCourseStringTypeKeys.includes(key)) {
            throw new InsightError("Passed invalid column key into SComparison");
        }
        if (datasetKind === InsightDatasetKind.Rooms && !DeserializingUtils.validRoomStringTypeKeys.includes(key)) {
            throw new InsightError("Passed invalid column key into SComparison");
        }

        // Validate that the string has no asterisks except at the beginning or end
        if (searchString.length > 2 && searchString.substring(1, searchString.length - 1).includes("*")) {
            throw new InsightError("Invalid wildcard character in string");
        }

        return new SComparison(key, searchString);
    }
}
