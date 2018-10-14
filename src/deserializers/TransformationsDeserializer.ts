import {ITransformations} from "../model/Options";
import {Apply, Average, Count, Max, Min, Sum} from "../model/Apply";
import {InsightDatasetKind, InsightError} from "../controller/IInsightFacade";
import {DeserializingUtils} from "./DeserializingUtils";

export class TransformationsDeserializer {

    private datasetKey: string;
    private kind: InsightDatasetKind;

    private applyTokens: string[] = ["MIN", "MAX", "AVG", "COUNT", "SUM"];

    public deserialize(rawJson: any): ITransformations {
        let keys = Object.keys(rawJson);
        if (keys.length !== 2) {
            throw new InsightError("Transformation was missing required elements (or had too many)");
        }
        DeserializingUtils.objectContainsKey(rawJson, "GROUP", "TRANSFORMATIONS");
        DeserializingUtils.objectContainsKey(rawJson, "APPLY", "TRANSFORMATIONS");
        return {
            group: this.deserializeGroup(rawJson["GROUP"]),
            apply: this.deserializeApplies(rawJson["APPLY"]),
            key: this.datasetKey,
            kind: this.kind
        };
    }

    private deserializeGroup(rawJson: any): string[] {
        DeserializingUtils.objectIsNonEmptyArray(rawJson, "GROUP");
        this.datasetKey = DeserializingUtils.getDataSetId(rawJson[0]);
        this.kind = DeserializingUtils.inferKind(rawJson[0]);
        return rawJson.map((group: any) => DeserializingUtils.getKey(group, this.datasetKey, this.kind));
    }

    private deserializeApplies(rawJson: any): Apply[] {
        DeserializingUtils.objectIsNonEmptyArray(rawJson, "APPLIES");
        let result: Apply[] = [];
        for (let apply of rawJson) {
            DeserializingUtils.objectContainsNKeys(apply, 1, "APPLY");
            let applyName = Object.keys(apply)[0];
            let applyBody = apply[applyName];
            DeserializingUtils.objectContainsNKeys(applyBody, 1, applyName);
            let token = Object.keys(applyBody)[0];
            if (!this.applyTokens.includes(token)) {
                throw new InsightError("Invalid token");
            }
            let column = applyBody[token];
            let key = DeserializingUtils.getKey(column, this.datasetKey, this.kind);
            result.push(this.createNewApply(applyName, token, key));
        }
        let names = result.map((a) => a.getName());
        if (new Set(names).size !== names.length) {
            throw new InsightError("Repeated apply name");
        }
        return result;
    }

    private createNewApply(applyName: string, token: string, key: string) {
        switch (token) {
            case "AVG":
                this.validateKeyIsNumberAndOfCorrectKind(key);
                return new Average(applyName, key);
            case "MIN":
                this.validateKeyIsNumberAndOfCorrectKind(key);
                return new Min(applyName, key);
            case "MAX":
                this.validateKeyIsNumberAndOfCorrectKind(key);
                return new Max(applyName, key);
            case "COUNT":
                this.validateKeyIsNumberAndOfCorrectKind(key);
                return new Count(applyName, key);
            case "SUM":
                this.validateKeyOfCorrectKind(key);
                return new Sum(applyName, key);
        }
    }

    private validateKeyIsNumberAndOfCorrectKind(key: string) {
        if (this.kind === InsightDatasetKind.Courses) {
            return DeserializingUtils.validCourseNumberTypeKeys.includes(key);
        } else if (this.kind === InsightDatasetKind.Rooms) {
            return DeserializingUtils.validRoomNumberTypeKeys.includes(key);
        } else {
            throw new InsightError("Unrecognized kind");
        }
    }

    private validateKeyOfCorrectKind(key: string) {
        if (this.kind === InsightDatasetKind.Courses) {
            return DeserializingUtils.validCourseKeys.includes(key);
        } else if (this.kind === InsightDatasetKind.Rooms) {
            return DeserializingUtils.validRoomKeys.includes(key);
        } else {
            throw new InsightError("Unrecognized kind");
        }
    }
}
