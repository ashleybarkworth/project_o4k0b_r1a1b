import {InsightError} from "../controller/IInsightFacade";
import {IOptions} from "../model/Options";

export class OptionsDeserializer {
    private validKeys = ["avg", "pass", "fail", "audit", "year", "dept", "id", "instructor", "title", "uuid"];

    public deserialize(options: any): IOptions {
        let ioptions: any = {};
        let optionKeys: string[] = Object.keys(options);
        let columns = this.getAndValidateColumns(optionKeys, options);
        let splitVals = columns.map((val) => val.split("_"));
        if (!splitVals.every((v) => v.length === 2)) {
            throw new InsightError("Invalid column");
        }
        let datasetIds = splitVals.map((val) => val[0]);
        let datasetId = datasetIds[0];
        if (!datasetIds.every((v) => v === datasetId)) {
            throw new InsightError("Mismatching dataset ids!");
        }
        ioptions.key = datasetId;
        let columnKeys = splitVals.map((val) => val[1]);
        if (!columnKeys.every((ck) => this.validKeys.includes(ck))) {
            throw new InsightError("Invalid column key");
        }
        ioptions["columns"] = columnKeys;
        if (optionKeys.length === 2) {
            if (!optionKeys.includes("ORDER")) {
                throw new InsightError("Unrecognized key in options");
            }
            let order = options.ORDER;
            if (!columns.includes(order)) {
                throw new InsightError("Trying to order by a value not in columns");
            }
            ioptions["order"] = order;
        }
        return ioptions;
    }

    private getAndValidateColumns(optionKeys: string[], options: any) {
        if (!optionKeys.includes("COLUMNS")) {
            throw new InsightError("Missing columns");
        }
        let columns = options.COLUMNS;
        if (!Array.isArray(columns) || columns.length === 0) {
            throw new InsightError("Columns format invalid");
        }
        return columns;
    }
}
