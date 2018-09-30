import {
    AndComparison,
    EqComparator, GtComparator,
    IFilter,
    LogicComparison,
    LtComparator,
    MComparator, Negation,
    OrComparison, SComparison
} from "../model/Filter";
import {InsightError} from "../controller/IInsightFacade";

export class FilterDeserializer {
    private filters: string[] = ["AND", "OR", "LT", "GT", "EQ", "IS", "NOT"];
    private validNumberTypeKeys = ["avg", "pass", "fail", "audit", "year"];
    private validStringTypeKeys: string[] = ["dept", "id", "instructor", "title", "uuid"];
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
    public deserialize(filter: any): IFilter {
        if (filter == null || filter === undefined || Array.isArray(filter)) {
            throw new InsightError("Malformed filter!");
        }
        let keys: string[] = Object.keys(filter);
        // The filter should contain one top-level key, e.g. "LT" or "AND" or "EQ"
        if (keys.length === 0 || keys.length > 1 || !this.filters.includes(keys[0])) {
            throw new InsightError("Invalid filter");
        }
        let key = keys[0];
        switch (key) {
            case "AND":
            case "OR":
                return this.deserializeLogicComparison(filter[key], key);
            case "LT":
            case "GT":
            case "EQ":
                return this.deserializeMComparator(filter[key], key);
            case "IS":
                return this.deserializeSComparison(filter[key]);
            case "NOT":
                return this.deserializeNegation(filter[key]);
        }
    }

    /*
    A LogicComparison contains nothing but an array of inner filters
     */
    private deserializeLogicComparison(filterBody: any, kind: string): LogicComparison {
        // Must be an array, and must have at least one value
        if (!Array.isArray(filterBody || filterBody.length < 1)) {
            throw new InsightError("Passed a non-array value or an empty array into a logic comparison");
        }
        // Deserialize each of the inner filters
        let innerFilters: IFilter[] = filterBody.map((filter: any) => this.deserialize(filter));
        return kind === "AND" ? new AndComparison(innerFilters) : new OrComparison(innerFilters);
    }

    /*
    An MComparator contains a key/value pair.
    -   The key is in the form id_key, where id is the courses id, and key must correspond to a valid
        ICourseSection property with a numeric value.
    -   The value is a number that will be compared against the course section property corresponding to the key.
     */
    private deserializeMComparator(filterBody: any, kind: string): MComparator {
        let keys: string[] = Object.keys(filterBody);
        // Should contain exactly one top-level key/value pair.
        if (keys.length === 0 || keys.length > 1) {
            throw new InsightError("Invalid filter");
        }
        let keyAndId = keys[0];                 // In the form id_key
        let val: any = filterBody[keyAndId];    // Get the value from the key/value pair
        let key = this.getKey(keyAndId);        // Extract the key from id_key (and validate it)

        // Check the key corresponds to an ICourseSection property with a numeric value
        if (!this.validNumberTypeKeys.includes(key)) {
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
    private deserializeNegation(filterBody: any) {
        let innerFilter: IFilter = this.deserialize(filterBody);
        return new Negation(innerFilter);
    }

    /*
    An SComparison (IS) contains a key/value pair.
    -   The key is in the form id_key, where id is the courses id, and key must correspond to a valid
        ICourseSection property with a string value.
    -   The value is a string of the form `[*]? [^*]* [*]?`.
     */
    private deserializeSComparison(filterBody: any) {
        let keys: string[] = Object.keys(filterBody);
        // Should contain exactly one top-level key/value pair.
        if (keys.length === 0 || keys.length > 1) {
            throw new InsightError("Invalid filter");
        }
        let keyAndId = keys[0];                          // In the form id_key
        let searchString: any = filterBody[keyAndId];    // Get the value from the key/value pair
        let key = this.getKey(keyAndId);                 // Extract the key from id_key (and validate it)

        if (typeof searchString !== "string") {
            throw new InsightError("Tried to pass a non-string value into scomparison");
        }

        if (!this.validStringTypeKeys.includes(key)) {
            throw new InsightError("Passed invalid column key into SComparison");
        }

        // Validate that the string has no asterisks except at the beginning or end
        if (searchString.length > 2 && searchString.substring(1, searchString.length - 1).includes("*")) {
            throw new InsightError("Invalid wildcard character in string");
        }

        return new SComparison(key, searchString);
    }

    /*
    Given a string of the form id_key, where id is the dataset id, and key must correspond to a valid
    ICourseSection property, return the key. Also validate that the id is valid for this dataset.
     */
    private getKey(keyAndId: any) {
        if (typeof(keyAndId) !== "string") {
            throw new InsightError("Non-string passed into key");
        }
        let split = keyAndId.split("_");
        if (split.length !== 2) {
            throw new InsightError("Invalid key");
        }
        let datasetId = split[0];
        let key = split[1];
        if (this.datasetKey !== datasetId) {
            throw new InsightError("Mismatching dataset ids within query");
        }
        if (!this.validStringTypeKeys.includes(key) && !this.validNumberTypeKeys.includes(key)) {
            throw new InsightError("Invalid key");
        }
        return key;
    }
}
