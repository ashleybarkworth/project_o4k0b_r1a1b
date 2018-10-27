import {InsightDatasetKind, InsightError} from "../controller/IInsightFacade";

export class DeserializingUtils {
    public static validCourseNumberTypeKeys: string[] = ["avg", "pass", "fail", "audit", "year"];
    public static validCourseStringTypeKeys: string[] = ["dept", "id", "instructor", "title", "uuid"];
    public static validCourseKeys: string[] = DeserializingUtils.validCourseStringTypeKeys
        .concat(DeserializingUtils.validCourseNumberTypeKeys);
    public static validRoomNumberTypeKeys: string[] = ["lat", "lon", "seats"];
    public static validRoomStringTypeKeys: string[] = ["fullname", "shortname", "number", "name",
        "address", "type", "furniture", "href"];
    public static validRoomKeys: string[] = DeserializingUtils.validRoomStringTypeKeys
        .concat(DeserializingUtils.validRoomNumberTypeKeys);

    /*
        Given a string of the form id_key, where id is the dataset id, and key must correspond to a valid
        ICourseSection property, return the key. Also validate that the id is valid for this dataset.
     */
    public static getKey(keyAndId: any, datasetIdToMatch: string, datasetKind: InsightDatasetKind) {
        if (typeof(keyAndId) !== "string") {
            throw new InsightError("Non-string passed into key");
        }
        let split = keyAndId.split("_");
        if (split.length !== 2) {
            throw new InsightError("Invalid key");
        }
        let datasetId = split[0];
        if (datasetIdToMatch !== datasetId) {
            throw new InsightError("Mismatching dataset ids within query");
        }
        let key = split[1];
        if (datasetKind === InsightDatasetKind.Courses && !DeserializingUtils.validCourseKeys.includes(key)) {
            throw new InsightError("Invalid key");
        }
        if (datasetKind === InsightDatasetKind.Rooms && !DeserializingUtils.validRoomKeys.includes(key)) {
            throw new InsightError("Invalid key");
        }
        return key;
    }

    public static getDataSetId(keyAndId: string) {
        let split = keyAndId.split("_");
        if (split.length !== 2) {
            throw new InsightError("Invalid key");
        }
        return split[0];
    }

    public static inferKind(keyAndId: string): InsightDatasetKind {
        let split = keyAndId.split("_");
        if (split.length !== 2) {
            throw new InsightError("Invalid key");
        }
        let key = split[1];
        if (this.validRoomKeys.includes(key)) {
            return InsightDatasetKind.Rooms;
        } else if (this.validCourseKeys.includes(key)) {
            return InsightDatasetKind.Courses;
        } else {
            throw new InsightError("Unrecognized key");
        }
    }

    public static objectContainsNKeys(obj: any, n: number, name: string) {
        let keys = Object.keys(obj);
        if (Array.isArray(obj) || ! (obj instanceof Object) || keys.length !== n) {
            throw new InsightError(name + " is not an object containing exactly " + n + " keys");
        }
    }

    public static objectIsNonEmptyArray(obj: any, name: string) {
        if (!Array.isArray(obj) || obj.length === 0) {
            throw new InsightError(name + " is not a non-empty array");
        }
    }

    public static objectIsArray(obj: any, name: string) {
        if (!Array.isArray(obj)) {
            throw new InsightError(name + " is not an array");
        }
    }

    public static objectContainsKey(obj: any, key: string, name: string) {
        if (!Object.keys(obj).includes(key)) {
            throw new InsightError(name + " did not contain key " + key);
        }
    }
}
