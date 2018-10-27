import {expect} from "chai";

import {DeserializingUtils} from "../src/deserializers/DeserializingUtils";
import {InsightDatasetKind, InsightError} from "../src/controller/IInsightFacade";

describe("Test DeserializingUtils", () => {
    it("Test getDatasetId", () => {
        expect(() => DeserializingUtils.getDataSetId("test")).to.throw(InsightError);
        expect(() => DeserializingUtils.getDataSetId("test_test_test")).to.throw(InsightError);
        expect(DeserializingUtils.getDataSetId("courses_avg")).to.eq("courses");
    });

    it("Test inferKind", () => {
        expect(() => DeserializingUtils.inferKind("test")).to.throw(InsightError);
        expect(() => DeserializingUtils.inferKind("test_test_test")).to.throw(InsightError);
        expect(() => DeserializingUtils.inferKind("courses_boo")).to.throw(InsightError);
        expect(DeserializingUtils.inferKind("courses_avg")).to.eq(InsightDatasetKind.Courses);
        expect(DeserializingUtils.inferKind("rooms_lat")).to.eq(InsightDatasetKind.Rooms);
    });

    it("Test objectContainsNKeys", () => {
        expect(() => DeserializingUtils.objectContainsNKeys(["a"], 1, "")).to.throw(InsightError);
        expect(() => DeserializingUtils.objectContainsNKeys("a", 1, "")).to.throw(InsightError);
        expect(() => DeserializingUtils.objectContainsNKeys({}, 2, "")).to.throw(InsightError);
        DeserializingUtils.objectContainsNKeys({}, 0, ""); // shouldn't throw error
        DeserializingUtils.objectContainsNKeys({CAT: {}, DOG: {}}, 2, ""); // shouldn't throw error
    });

    it("Test objectIsNonEmptyArray", () => {
        expect(() => DeserializingUtils.objectIsNonEmptyArray([], "test")).to.throw(InsightError);
        expect(() => DeserializingUtils.objectIsNonEmptyArray("a", "test")).to.throw(InsightError);
        expect(() => DeserializingUtils.objectIsNonEmptyArray({}, "test")).to.throw(InsightError);
        DeserializingUtils.objectIsNonEmptyArray(["a"], "");
    });

    it("Test objectIsArray", () => {
        expect(() => DeserializingUtils.objectIsArray("a", "test")).to.throw(InsightError);
        expect(() => DeserializingUtils.objectIsArray({}, "test")).to.throw(InsightError);
        DeserializingUtils.objectIsArray([], "test");
        DeserializingUtils.objectIsArray(["a"], "");
    });
});
