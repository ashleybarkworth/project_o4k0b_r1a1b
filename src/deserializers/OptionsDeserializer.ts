import {InsightDatasetKind, InsightError} from "../controller/IInsightFacade";
import {IOptions, ITransformations} from "../model/Options";
import {DeserializingUtils} from "./DeserializingUtils";

export class OptionsDeserializer {

    private transformations: ITransformations;

    constructor(transformations: ITransformations) {
        this.transformations = transformations;
    }

    public deserialize(options: any): IOptions {
        let ioptions: any = {};

        let columns = OptionsDeserializer.getColumns(options);

        if (this.transformations == null) {
            let splitVals: string[][] = columns.map((val) => val.split("_"));
            if (!splitVals.every((v) => v.length === 2)) {
                throw new InsightError("Invalid column");
            }
            ioptions.key = this.getDatasetId(splitVals);
            let columnKeys = splitVals.map((val) => val[1]);
            ioptions.kind = this.getKind(columnKeys);
            ioptions.columns = columnKeys;
        } else {
            ioptions.columns = this.getColumnsMatchingTransformations(columns);
            ioptions.kind = this.transformations.kind;
            ioptions.key = this.transformations.key;
        }
        let numberOfObjectKeys = Object.keys(options).length;
        if (numberOfObjectKeys === 2) {
            ioptions["order"] = OptionsDeserializer.getOrder(options, columns);
        }
        return ioptions;
    }

    private getColumnsMatchingTransformations(columns: string[]): string[] {
        return columns.map((c) => {
            let matchesApplyKey: boolean = this.transformations.apply.some((a) => a.getName() === c);
            if (!matchesApplyKey) {
                let key = DeserializingUtils.getKey(c, this.transformations.key, this.transformations.kind);
                if (!this.transformations.group.includes(key)) {
                    throw new InsightError("Invalid column");
                }
                return key;
            } else {
                return c;
            }
        });
    }

    private getKind(columnKeys: string[]): InsightDatasetKind {
        if (columnKeys.every((ck) => DeserializingUtils.validCourseKeys.includes(ck))) {
            return InsightDatasetKind.Courses;
        } else if (columnKeys.every((ck) => DeserializingUtils.validRoomKeys.includes(ck))) {
            return InsightDatasetKind.Rooms;
        } else {
            throw new InsightError("Query contains invalid or mismatching column keys");
        }
    }

    private getDatasetId(splitVals: string[][]): string {
        let datasetIds = splitVals.map((val) => val[0]);
        let datasetId = datasetIds[0];
        if (!datasetIds.every((v) => v === datasetId)) {
            throw new InsightError("Mismatching dataset ids!");
        }
        return datasetId;
    }

    private static getOrder(options: any, columns: string[]): string {
        DeserializingUtils.objectContainsKey(options, "ORDER", "OPTIONS");
        let order = options.ORDER;
        if (!columns.includes(order)) {
            throw new InsightError("Trying to order by a value not in columns");
        }
        return order;
    }

    private static getColumns(options: any): string[] {
        DeserializingUtils.objectContainsKey(options, "COLUMNS", "OPTIONS");
        let columns = options.COLUMNS;
        DeserializingUtils.objectIsNonEmptyArray(columns, "COLUMNS");
        return columns;
    }
}
