import {expect} from "chai";
import {FilterDeserializer} from "../src/deserializers/FilterDeserializer";
import {AndComparison, GtComparator, IFilter, OrComparison} from "../src/model/Filter.js";
import {ICourseSection} from "../src/model/IFullDataset";

describe("Simple deserialize tests", () => {

    let courseSection: ICourseSection = {
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
    };

    it("Should deserialize a simple GT query", () => {
        let query: any = {
            GT: {
                courses_avg: 40
            }
        };
        let filterDeserializer: FilterDeserializer = new FilterDeserializer("courses");
        let filter: IFilter = filterDeserializer.deserialize(query);
        expect(filter.validEntry(courseSection)).to.be.eq(true);
        expect(filter).to.be.instanceOf(GtComparator);
    });
    it("Should deserialize a simple AND query", () => {
        let query: any = {
            AND: [
                {
                    LT: {
                        courses_avg: 60
                    }
                },
                {
                    NOT: {
                        EQ: {
                            courses_avg: 0
                        }
                    }
                }
            ]
        };
        let filterDeserializer: FilterDeserializer = new FilterDeserializer("courses");
        let filter: IFilter = filterDeserializer.deserialize(query);
        expect(filter).to.be.instanceOf(AndComparison);
        expect(filter.validEntry(courseSection)).to.be.eq(true);
        courseSection.avg = 0;
        expect(filter.validEntry(courseSection)).to.be.eq(false);
        courseSection.avg = 50;
    });
    it("Should deserialize an OR query", () => {
        let query: any = {
            OR: [
                {
                    IS: {
                        courses_title: "*oftware*"
                    }
                },
                {
                    IS: {
                        courses_dept: ""
                    }
                }
            ]
        };
        let filterDeserializer: FilterDeserializer = new FilterDeserializer("courses");
        let filter: IFilter = filterDeserializer.deserialize(query);
        expect(filter).to.be.instanceOf(OrComparison);
        expect(filter.validEntry(courseSection)).to.be.eq(true);
    });
});
