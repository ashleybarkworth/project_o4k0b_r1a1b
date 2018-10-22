import {expect} from "chai";
import {Apply, Average, Count, Max, Min, Sum} from "../src/model/Apply";
import {ICourseSection} from "../src/model/IFullDataset";
import {ITransformations} from "../src/model/Options";
import {TransformationsDeserializer} from "../src/deserializers/TransformationsDeserializer";
import {InsightDatasetKind} from "../src/controller/IInsightFacade";

let courseSections: ICourseSection[] = [
    {
        id: "310",
        dept: "cpsc",
        avg: 50,
        instructor: "Reid Holmes",
        title: "Software Something",
        pass: 200,
        fail: 20,
        audit: 2,
        uuid: "testa",
        year: 2017
    },
    {
        id: "310",
        dept: "cpsc",
        avg: 60,
        instructor: "Reid Holmes",
        title: "Software Something",
        pass: 200,
        fail: 20,
        audit: 2,
        uuid: "testa",
        year: 2017
    },
    {
        id: "310",
        dept: "span",
        avg: 90,
        instructor: "Reid Holmes",
        title: "Software Something",
        pass: 200,
        fail: 20,
        audit: 2,
        uuid: "testa",
        year: 2017
    },
    {
        id: "310",
        dept: "adhe",
        avg: 11.1118,
        instructor: "Reid Holmes",
        title: "Software Something",
        pass: 200,
        fail: 20,
        audit: 1,
        uuid: "testa",
        year: 2017
    }
];

describe("Test Apply", function () {

    it("Test max apply", function () {
        let maxApply: Apply = new Max("overallMax", "avg");
        expect(maxApply.apply(courseSections)).to.eq(90);
    });

    it("Test max apply with only one section", function () {
        let maxApply: Apply = new Max("overallMax", "avg");
        expect(maxApply.apply([courseSections[0]])).to.eq(50);
    });

    it("Test min apply", function () {
        let minApply: Apply = new Min("minAudit", "audit");
        expect(minApply.apply(courseSections)).to.eq(1);
    });

    it("Test sum apply", function () {
        let sumApply: Apply = new Sum("overallSum", "pass");
        let result = sumApply.apply(courseSections);
        expect(result).to.eq(800);

        let roundingApply = new Sum("sum2", "avg");
        expect(roundingApply.apply(courseSections)).to.eq(211.11);
    });

    it("Test count apply", function () {
        let count: Apply = new Count("overallCount", "dept");
        expect(count.apply(courseSections)).to.eq(3);
    });

    it("Test average", function () {
        let apply: Apply = new Average("overallAverage", "audit");
        expect(apply.apply(courseSections)).to.eq(1.75);
    });
});

describe("Test deserialization", function () {
    let sampleJson = {
        GROUP: ["courses_title"],
        APPLY: [{
            overallAvg: {
                AVG: "courses_avg"
            }
        }]
    };
    it("Should deserialize", function () {
        let deserializer: TransformationsDeserializer = new TransformationsDeserializer();
        let transformations: ITransformations = deserializer.deserialize(sampleJson);

        expect(transformations.group).to.deep.eq(["title"]);
        expect(transformations.apply).to.have.length(1);
        expect(transformations.key).to.deep.eq("courses");
        expect(transformations.kind).to.eq(InsightDatasetKind.Courses);
        let apply: Apply = transformations.apply[0];
        expect(apply.getName()).to.deep.eq("overallAvg");
        expect(apply.apply(courseSections)).to.eq(52.5);
    });
});
