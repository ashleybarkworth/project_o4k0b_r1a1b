import {
    AndComparison,
    EqComparator, GtComparator,
    IFilter,
    LogicComparison,
    LtComparator,
    MComparator, Negation,
    OrComparison, SComparison
} from "./model/Filter.js.js";
import {InsightError} from "./controller/IInsightFacade";

export class FilterDeserializer {
    private filters: string[] = ["AND", "OR", "LT", "GT", "EQ", "IS", "NOT"];
    private datasetKey: string = null;

    public deserialize(filter: any): IFilter {
        let keys: string[] = Object.keys(filter);
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
        throw new InsightError("Something went very wrong!");
    }

    private deserializeLogicComparison(filterBody: any, type: string): LogicComparison {
        if (!Array.isArray(filterBody || filterBody.length < 1)) {
            throw new InsightError("Passed a non-array value into a logic comparison");
        }
        let innerFilters: IFilter[] = filterBody.map((filter: any) => this.deserialize(filter));
        return type === "AND" ? new AndComparison(innerFilters) : new OrComparison(innerFilters);
    }

    private deserializeMComparator(filterBody: any, type: string): MComparator {
        let keys: string[] = Object.keys(filterBody);
        if (keys.length === 0 || keys.length > 1) {
            throw new InsightError("Invalid filter");
        }
        let keyAndId = keys[0];
        let key = this.getKey(keyAndId);
        let val: number = filterBody[keyAndId];
        switch (type) {
            case "LT":
                return new LtComparator(key, val);
            case "EQ":
                return new EqComparator(key, val);
            case "GT":
                return new GtComparator(key, val);
        }
        throw new InsightError("Uh oh");
    }

    private deserializeNegation(filterBody: any) {
        let innerFilter: IFilter = this.deserialize(filterBody);
        return new Negation(innerFilter);
    }

    private deserializeSComparison(filterBody: any) {
        let keys: string[] = Object.keys(filterBody);
        if (keys.length === 0 || keys.length > 1) {
            throw new InsightError("Invalid filter");
        }
        let keyAndId = keys[0];
        let key = this.getKey(keyAndId);
        let searchString: string = filterBody[keyAndId];
        return new SComparison(key, searchString);
    }

    private getKey(keyAndId: string) {
        let split = keyAndId.split("_");
        if (split.length !== 2) {
            throw new InsightError("Invalid key");
        }
        let datasetId = split[0];
        let key = split[1];
        if (this.datasetKey === null) {
            this.datasetKey = datasetId;
        } else if (this.datasetKey !== datasetId) {
            throw new InsightError("Mismatching dataset ids within query");
        }
        // TODO kayla check that key is valid
        return key;
    }
}
